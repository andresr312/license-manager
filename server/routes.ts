// Endpoint para analytics del dashboard


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

  // Middleware para verificar rol admin
function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "Solo administradores pueden realizar esta acción." });
  }
  next();
}

  // Endpoint para marcar pago como pagado (solo admin)
  app.put("/api/payments/:id/pay", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { reference, notes, method } = req.body;
      // Actualizar estado del pago
      const updated = await storage.updatePaymentStatus(id, "cobrado", req.user?.username || "");
      // Guardar método, referencia y notas si se envían
      if (updated) {
        if (method) updated.method = method;
        if (reference) updated.reference = reference;
        if (notes) updated.notes = notes;
        // Actualizar en la base de datos
        await storage.updatePaymentStatus(id, "cobrado", req.user?.username || "");
      }
      // Obtener datos de la licencia para el log
      let licenseInfo = "";
      if (updated && updated.licenseId) {
        const license = await storage.getLicense(updated.licenseId);
        if (license) {
          licenseInfo = `${license.businessName} (${license.rif})`;
        }
      }
      // Crear log de auditoría
      await logAudit({
        user_id: req.user?.id || "",
        username: req.user?.username || "",
        action: "mark_payment_paid",
        details: `Pago marcado como cobrado: ${licenseInfo}\nMétodo: ${method}\nReferencia: ${reference}\nNotas: ${notes}`
      });
      res.json(updated);
    } catch (error) {
      console.error("Error al marcar pago como pagado:", error);
      res.status(500).json({ message: "Error al marcar pago como pagado" });
    }
  });
  app.get("/api/dashboard-analytics", authenticateToken, async (req, res) => {
    try {
      const licenses = await storage.getAllLicenses();
      const today = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
      const thisMonth = new Date();
      thisMonth.setDate(1);
      const thisMonthEpoch = Math.floor(thisMonth.getTime() / (1000 * 60 * 60 * 24));
      const monthlyRevenue = licenses
        .filter(license => license.creationEpochDay >= thisMonthEpoch)
        .reduce((sum, license) => sum + license.cost, 0);
      const totalLicenses = licenses.length;
      const activeLicenses = licenses.filter(license => license.expirationEpochDay >= today).length;
      const expiringLicenses = licenses.filter(license => {
        const daysRemaining = license.expirationEpochDay - today;
        return daysRemaining >= 0 && daysRemaining <= 7;
      }).length;
      const expiredLicenses = licenses.filter(license => license.expirationEpochDay < today).length;
      res.json({
        totalLicenses,
        activeLicenses,
        expiringLicenses,
        expiredLicenses,
        monthlyRevenue
      });
    } catch (error) {
      console.error("Error fetching dashboard analytics:", error);
      res.status(500).json({ message: "Error fetching dashboard analytics" });
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
        if (daysRemaining <= 0) {
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

    app.get("/api/payments", authenticateToken, async (req, res) => {
    try {
      const { status } = req.query;
      const payments = await storage.getAllPayments(typeof status === "string" ? status : undefined);
      const licenseIds = payments.map(p => p.licenseId);
      const licenses = await storage.getAllLicenses();
      const licenseMap = new Map(licenses.map(l => [l.id, l]));
      const paymentsWithLicense = payments.map(p => ({
        ...p,
        businessName: licenseMap.get(p.licenseId)?.businessName || "",
        rif: licenseMap.get(p.licenseId)?.rif || ""
      }));
      res.json(paymentsWithLicense);
    } catch (error) {
      console.error("Error al listar pagos:", error);
      res.status(500).json({ message: "Error al listar pagos" });
    }
  });

    app.delete("/api/payments/:id", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deletePayment(id);
      if (!deleted) {
        return res.status(404).json({ message: "Payment not found" });
      }
      await logAudit({ user_id: req.user?.id || "", username: req.user?.username || "", action: "delete_payment", details: `Pago eliminado: ${id}` });
      res.json({ message: "Payment deleted successfully" });
    } catch (error) {
      console.error("Error deleting payment:", error);
      res.status(500).json({ message: "Error deleting payment" });
    }
  });

  app.post("/api/licenses", authenticateToken, async (req, res) => {
    try {
      const data = insertLicenseSchema.parse(req.body);
      const { paymentMethod, paymentReference, paymentNotes } = req.body;
      const creationEpochDay = Math.floor(Date.now() / (1000 * 60 * 60 * 24)) + 1;
      const expirationDate = new Date(data.expirationEpochDay * 24 * 60 * 60 * 1000);
      const creationDate = new Date((creationEpochDay + 1) * 24 * 60 * 60 * 1000);
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
      // Crear pago asociado
      const payment = await storage.createPayment({
        licenseId: license.id,
        amount: license.cost,
        method: paymentMethod || "efectivo",
        status: "por cobrar",
        createdAt: Date.now(),
        reference: paymentReference || "",
        notes: paymentNotes || ""
      });
      await logAudit({
        user_id: req.user?.id || "",
        username: req.user?.username || "",
        action: "create_license",
        details: `Licencia creada: ${license.id}\nRIF: ${license.rif}\nBusiness: ${license.businessName}\nTipo: ${license.licenseType}\nExpira: ${license.expirationEpochDay}\nCosto: ${license.cost}\nHWID: ${license.hardwareId}\nDirección: ${license.direccion1} ${license.direccion2} ${license.direccion3} ${license.direccion4}\nPago creado: ${payment.id} (${payment.method})`
      });
      await DiscordNotifier.sendLicenseCreated(license);
      res.json({ license, payment });
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
      // Set creationEpochDay to today
      const todayEpochDay = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
      const todayDate = new Date(todayEpochDay * 24 * 60 * 60 * 1000);
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
        todayDate.toLocaleDateString('es-ES')
      );
      const updateData: any = {
        expirationEpochDay: newExpirationEpochDay,
        encodedLicense,
        creationEpochDay: todayEpochDay
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
  app.delete("/api/licenses/:id", authenticateToken, requireAdmin, async (req, res) => {
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

  function getISOWeek(date: Date) {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
        const weekNum = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
        return { year: d.getUTCFullYear(), week: weekNum };
  }


  app.get("/api/analytics", authenticateToken, async (req, res) => {
      try {
      const { week } = req.query;
      const licenses = await storage.getAllLicenses();
      const payments = await storage.getAllPayments();
      // Función consistente para obtener el año y número de semana ISO


      // Filtrar pagos por semana
      let filteredPayments = payments;
      if (week) {
        const [targetYear, targetWeek] = String(week).split("-").map(Number);
        filteredPayments = payments.filter(p => {
          if (!p.createdAt || typeof p.createdAt !== 'number' || p.createdAt < 1000000000000) return false;
          const { year, week: paymentWeek } = getISOWeek(new Date(p.createdAt));
          return year === targetYear && paymentWeek === targetWeek;
        });
      }
      // Calcular ingresos cobrados y por cobrar
      const cobrados = filteredPayments.filter(p => p.status === "cobrado").reduce((sum, p) => sum + p.amount, 0);
      const porCobrar = filteredPayments.filter(p => p.status === "por cobrar").reduce((sum, p) => sum + p.amount, 0);
      const totalRevenue = cobrados + porCobrar;
      const porcentajeCobrado = totalRevenue > 0 ? Math.round((cobrados / totalRevenue) * 100) : 0;
      const porcentajePorCobrar = totalRevenue > 0 ? Math.round((porCobrar / totalRevenue) * 100) : 0;
      // Semanas disponibles
      const allWeeks = Array.from(new Set(payments.map(p => {
        const { year, week } = getISOWeek(new Date(p.createdAt));
        return `${year}-${week}`;
      })));
      // Calcular stats clásicos
      const today = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
      const thisMonth = new Date();
      thisMonth.setDate(1);
      const thisMonthEpoch = Math.floor(thisMonth.getTime() / (1000 * 60 * 60 * 24));
      const monthlyRevenue = licenses
        .filter(license => license.creationEpochDay >= thisMonthEpoch)
        .reduce((sum, license) => sum + license.cost, 0);
      const weeklyRevenue = filteredPayments.reduce((sum, p) => sum + p.amount, 0);
      const totalLicenses = licenses.length;
      const activeLicenses = licenses.filter(license => license.expirationEpochDay >= today).length;
      const expiringLicenses = licenses.filter(license => {
        const daysRemaining = license.expirationEpochDay - today;
        return daysRemaining >= 0 && daysRemaining <= 7;
      }).length;
      const expiredLicenses = licenses.filter(license => license.expirationEpochDay < today).length;
      res.json({
        totalRevenue,
        monthlyRevenue,
        weeklyRevenue,
        totalLicenses,
        activeLicenses,
        expiringLicenses,
        expiredLicenses,
        cobrados,
        porCobrar,
        porcentajeCobrado,
        porcentajePorCobrar,
  weeks: allWeeks,
  selectedWeek: typeof week === "string" && week.length > 0 ? week : null
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

  app.post("/api/split-people", authenticateToken, requireAdmin, async (req, res) => {
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