
import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertLicenseSchema, insertSplitPersonSchema } from "@shared/schema";
import { LicenseGenerator } from "./services/encryption";
import { DiscordNotifier } from "./services/discord";
import { z } from "zod";
import jwt from "jsonwebtoken";
import { logAudit, orm } from "./audit-log";
import { auditLogs } from "@shared/audit";
import { eq, gte, lte, and } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

// Middleware para verificar JWT
function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Token requerido" });
  jwt.verify(token, process.env.JWT_SECRET || "supersecretkey", (err, user) => {
    if (err) return res.status(403).json({ message: "Token inválido" });
    req.user = user as { id: string; username: string; name?: string };
    next();
  });
}

// Extender tipo Request para incluir user
declare global {
  namespace Express {
    interface Request {
      user?: { id: string; username: string; name?: string; role?: string };
    }
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Endpoint para consultar logs de auditoría
  app.get("/api/audit-logs", authenticateToken, async (req, res) => {
    try {
      const { page = 1, pageSize = 20, user, from, to } = req.query;
      let whereClauses = [];
      if (typeof user === "string" && user.length > 0) {
        whereClauses.push(eq(auditLogs.username, user));
      }
      if (typeof from === "string" && from.length > 0) {
        const fromDate = new Date(from);
        if (!isNaN(fromDate.getTime())) {
          whereClauses.push(gte(auditLogs.created_at, fromDate));
        }
      }
      if (typeof to === "string" && to.length > 0) {
        const toDate = new Date(to);
        if (!isNaN(toDate.getTime())) {
          whereClauses.push(lte(auditLogs.created_at, toDate));
        }
      }
      const offset = (Number(page) - 1) * Number(pageSize);
      const logs = await (
        whereClauses.length > 0
          ? orm.select().from(auditLogs).where(and(...whereClauses)).limit(Number(pageSize)).offset(offset)
          : orm.select().from(auditLogs).limit(Number(pageSize)).offset(offset)
      );
      res.json(logs);
    } catch (error) {
      res.status(500).json({ message: "Error al cargar logs" });
    }
  });
  // Login con JWT
  app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: 'Usuario y contraseña requeridos' });
    }
    const user = await storage.loginUser(username, password);
    if (user) {
      const token = jwt.sign({ id: user.id, username: user.username, name: user.name, role: user.role }, process.env.JWT_SECRET || "supersecretkey", { expiresIn: "1d" });
      await logAudit({ user_id: user.id, username: user.username, action: "login", details: "Login exitoso" });
      return res.json({ message: 'Login exitoso', token, user: { id: user.id, username: user.username, name: user.name, role: user.role } });
    } else {
      return res.status(401).json({ message: 'Usuario o contraseña incorrectos' });
    }
  });

  // Get current user (token)
  app.get('/api/me', authenticateToken, (req, res) => {
    if (req.user) {
      return res.json({ user: req.user });
    }
    return res.status(401).json({ message: 'No autenticado' });
  });

  // Get all licenses with status calculation
  app.get("/api/licenses", authenticateToken, async (req, res) => {
    try {
      const licenses = await storage.getAllLicenses();
      const today = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
      const licensesWithStatus = licenses.map(license => {
        const daysRemaining = license.expirationEpochDay - today;
        let status: 'active' | 'expiring' | 'expired' = 'active';
        if (daysRemaining < 0) {
          status = 'expired';
        } else if (daysRemaining <= 7) {
          status = 'expiring';
        }
        return {
          ...license,
          status,
          daysRemaining: Math.max(0, daysRemaining)
        };
      }).sort((a, b) => a.daysRemaining - b.daysRemaining);
  // No loguear consultas
      res.json(licensesWithStatus);
    } catch (error) {
      console.error("Error fetching licenses:", error);
      res.status(500).json({ message: "Error fetching licenses" });
    }
  });

  // Create new license
  app.post("/api/licenses", authenticateToken, async (req, res) => {
    try {
      const data = insertLicenseSchema.parse(req.body);
      const creationEpochDay = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
      const expirationDate = new Date(data.expirationEpochDay * 24 * 60 * 60 * 1000);
      const creationDate = new Date(creationEpochDay * 24 * 60 * 60 * 1000);
      const encodedLicense = LicenseGenerator.generateLicense(
        expirationDate.toLocaleDateString('es-ES'),
        data.rif,
        data.businessName,
        data.direccion1 || "",
        data.direccion2 || "",
        data.direccion3 || "",
        data.direccion4 || "",
        data.adminPassword,
        data.licenseType,
        data.hardwareId || "",
        creationDate.toLocaleDateString('es-ES')
      );
      const license = await storage.createLicense({
        ...data,
        id: uuidv4(),
        encodedLicense,
        creationEpochDay
      });
  await logAudit({
    user_id: req.user?.id || "",
    username: req.user?.username || "",
    action: "create_license",
    details: `Licencia creada: ${license.id}\nRIF: ${license.rif}\nBusiness: ${license.businessName}\nTipo: ${license.licenseType}\nExpira: ${license.expirationEpochDay}\nCosto: ${license.cost}\nHWID: ${license.hardwareId}\nDirección: ${license.direccion1} ${license.direccion2} ${license.direccion3} ${license.direccion4}`
  });
      await DiscordNotifier.sendLicenseCreated(license);
      res.json(license);
    } catch (error) {
      console.error("Error creating license:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid license data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Error creating license" });
      }
    }
  });

  // Renew license
  app.put("/api/licenses/:id/renew", authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const { newExpirationEpochDay, cost } = req.body;
      if (!newExpirationEpochDay || typeof newExpirationEpochDay !== 'number') {
        return res.status(400).json({ message: "New expiration date is required" });
      }
      const existingLicense = await storage.getLicense(id);
      if (!existingLicense) {
        return res.status(404).json({ message: "License not found" });
      }
      const expirationDate = new Date(newExpirationEpochDay * 24 * 60 * 60 * 1000);
      const creationDate = new Date(existingLicense.creationEpochDay * 24 * 60 * 60 * 1000);
      const encodedLicense = LicenseGenerator.generateLicense(
        expirationDate.toLocaleDateString('es-ES'),
        existingLicense.rif,
        existingLicense.businessName,
        existingLicense.direccion1 || "",
        existingLicense.direccion2 || "",
        existingLicense.direccion3 || "",
        existingLicense.direccion4 || "",
        existingLicense.adminPassword,
        existingLicense.licenseType,
        existingLicense.hardwareId || "",
        creationDate.toLocaleDateString('es-ES')
      );
      const updateData: any = {
        expirationEpochDay: newExpirationEpochDay,
        encodedLicense
      };
      if (typeof cost === 'number' && !isNaN(cost)) {
        updateData.cost = cost;
      }
      const updatedLicense = await storage.updateLicense(id, updateData);
      if (!updatedLicense) {
        return res.status(404).json({ message: "License not found" });
      }
  await logAudit({
    user_id: req.user?.id || "",
    username: req.user?.username || "",
    action: "renew_license",
    details: `Licencia renovada: ${id}\nRIF: ${updatedLicense.rif}\nBusiness: ${updatedLicense.businessName}\nTipo: ${updatedLicense.licenseType}\nExpira: ${updatedLicense.expirationEpochDay}\nCosto: ${updatedLicense.cost}\nHWID: ${updatedLicense.hardwareId}\nDirección: ${updatedLicense.direccion1} ${updatedLicense.direccion2} ${updatedLicense.direccion3} ${updatedLicense.direccion4}`
  });
      await DiscordNotifier.sendLicenseRenewed(existingLicense, updatedLicense);
      res.json(updatedLicense);
    } catch (error) {
      console.error("Error renewing license:", error);
      res.status(500).json({ message: "Error renewing license" });
    }
  });

  // Delete license
  app.delete("/api/licenses/:id", authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteLicense(id);
      if (!deleted) {
        return res.status(404).json({ message: "License not found" });
      }
  await logAudit({ user_id: req.user?.id || "", username: req.user?.username || "", action: "delete_license", details: `Licencia eliminada: ${id}` });
      res.json({ message: "License deleted successfully" });
    } catch (error) {
      console.error("Error deleting license:", error);
      res.status(500).json({ message: "Error deleting license" });
    }
  });

  // Get revenue analytics
  app.get("/api/analytics", authenticateToken, async (req, res) => {
    try {
      const licenses = await storage.getAllLicenses();
      const today = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
      const thisMonth = new Date();
      thisMonth.setDate(1);
      const thisMonthEpoch = Math.floor(thisMonth.getTime() / (1000 * 60 * 60 * 24));
      const totalRevenue = licenses.reduce((sum, license) => sum + license.cost, 0);
      const monthlyRevenue = licenses
        .filter(license => license.creationEpochDay >= thisMonthEpoch)
        .reduce((sum, license) => sum + license.cost, 0);
      const activeLicenses = licenses.filter(license => license.expirationEpochDay >= today).length;
      const expiringLicenses = licenses.filter(license => {
        const daysRemaining = license.expirationEpochDay - today;
        return daysRemaining >= 0 && daysRemaining <= 30;
      }).length;
      const expiredLicenses = licenses.filter(license => license.expirationEpochDay < today).length;
  // No loguear consultas
      res.json({
        totalRevenue,
        monthlyRevenue,
        weeklyRevenue: monthlyRevenue / 4, // Approximate
        totalLicenses: licenses.length,
        activeLicenses,
        expiringLicenses,
        expiredLicenses
      });
    } catch (error) {
      console.error("Error fetching analytics:", error);
      res.status(500).json({ message: "Error fetching analytics" });
    }
  });

  app.post('/api/users', authenticateToken, async (req, res) => {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'Solo administradores pueden crear usuarios.' });
    }
    const { username, password, name, role } = req.body;
    if (!username || !password || !role) {
      return res.status(400).json({ message: 'Faltan datos requeridos.' });
    }
    try {
  const newUser = await storage.createUser({ id: uuidv4(), username, password, name, role });
      await logAudit({
        user_id: req.user.id,
        username: req.user.username,
        action: 'create_user',
        details: `Usuario creado: ${newUser.id}\nUsername: ${newUser.username}\nNombre: ${newUser.name}\nRol: ${newUser.role}`
      });
      res.json({ message: 'Usuario creado correctamente', user: newUser });
    } catch (error) {
      res.status(500).json({ message: 'Error al crear usuario' });
    }
  });

  // Split people management
  app.get("/api/split-people", authenticateToken, async (req, res) => {
    try {
      const people = await storage.getAllSplitPeople();
  // No loguear consultas
      res.json(people);
    } catch (error) {
      console.error("Error fetching split people:", error);
      res.status(500).json({ message: "Error fetching split people" });
    }
  });

  app.post("/api/split-people", authenticateToken, async (req, res) => {
    try {
      const data = insertSplitPersonSchema.parse(req.body);
      const person = await storage.createSplitPerson({
        ...data,
        id: uuidv4()
      });
      await logAudit({
        user_id: req.user?.id || "",
        username: req.user?.username || "",
        action: "create_split_person",
        details: `Split person creado: ${person.id}\nNombre: ${person.name}\nPorcentaje: ${person.percentage}`
      });
      res.json(person);
    } catch (error) {
      console.error("Error creating split person:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid person data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Error creating split person" });
      }
    }
  });

  app.delete("/api/split-people/:id", authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteSplitPerson(id);
      if (!deleted) {
        return res.status(404).json({ message: "Person not found" });
      }
  await logAudit({ user_id: req.user?.id || "", username: req.user?.username || "", action: "delete_split_person", details: `Split person eliminado: ${id}` });
      res.json({ message: "Person deleted successfully" });
    } catch (error) {
      console.error("Error deleting split person:", error);
      res.status(500).json({ message: "Error deleting split person" });
    }
  });

  // Check expiring licenses and send notifications
  app.post("/api/check-expiring", authenticateToken, async (req, res) => {
    try {
      const licenses = await storage.getAllLicenses();
      const today = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
      const notifications = await storage.getExpiredNotifications();
      let notifiedCount = 0;
      for (const license of licenses) {
        const daysRemaining = license.expirationEpochDay - today;
        const alreadyNotified = notifications.get(license.id);
        if (daysRemaining >= 0 && daysRemaining <= 7 && alreadyNotified !== license.expirationEpochDay) {
          await DiscordNotifier.sendLicenseExpiring(license, daysRemaining);
          await storage.setExpiredNotification(license.id, license.expirationEpochDay);
          notifiedCount++;
        }
      }
  await logAudit({ user_id: req.user?.id || "", username: req.user?.username || "", action: "check_expiring", details: `Notificaciones enviadas: ${notifiedCount}` });
      res.json({ notifiedCount });
    } catch (error) {
      console.error("Error checking expiring licenses:", error);
      res.status(500).json({ message: "Error checking expiring licenses" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}