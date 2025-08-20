import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertLicenseSchema, insertSplitPersonSchema } from "@shared/schema";
import { LicenseGenerator } from "./services/encryption";
import { DiscordNotifier } from "./services/discord";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Get all licenses with status calculation
  app.get("/api/licenses", async (req, res) => {
    try {
      const licenses = await storage.getAllLicenses();
      const today = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
      
      const licensesWithStatus = licenses.map(license => {
        const daysRemaining = license.expirationEpochDay - today;
        let status: 'active' | 'expiring' | 'expired' = 'active';
        
        if (daysRemaining < 0) {
          status = 'expired';
        } else if (daysRemaining <= 30) {
          status = 'expiring';
        }
        
        return {
          ...license,
          status,
          daysRemaining: Math.max(0, daysRemaining)
        };
      }).sort((a, b) => a.daysRemaining - b.daysRemaining);
      
      res.json(licensesWithStatus);
    } catch (error) {
      console.error("Error fetching licenses:", error);
      res.status(500).json({ message: "Error fetching licenses" });
    }
  });

  // Create new license
  app.post("/api/licenses", async (req, res) => {
    try {
      const data = insertLicenseSchema.parse(req.body);
      const creationEpochDay = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
      
      // Generate encrypted license
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
        encodedLicense,
        creationEpochDay
      });
      
      // Send Discord notification
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
  app.put("/api/licenses/:id/renew", async (req, res) => {
    try {
      const { id } = req.params;
      const { newExpirationEpochDay } = req.body;
      
      if (!newExpirationEpochDay || typeof newExpirationEpochDay !== 'number') {
        return res.status(400).json({ message: "New expiration date is required" });
      }
      
      const existingLicense = await storage.getLicense(id);
      if (!existingLicense) {
        return res.status(404).json({ message: "License not found" });
      }
      
      // Generate new encrypted license with updated expiration
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
      
      const updatedLicense = await storage.updateLicense(id, {
        expirationEpochDay: newExpirationEpochDay,
        encodedLicense
      });
      
      if (!updatedLicense) {
        return res.status(404).json({ message: "License not found" });
      }
      
      // Send Discord notification
      await DiscordNotifier.sendLicenseRenewed(existingLicense, updatedLicense);
      
      res.json(updatedLicense);
    } catch (error) {
      console.error("Error renewing license:", error);
      res.status(500).json({ message: "Error renewing license" });
    }
  });

  // Delete license
  app.delete("/api/licenses/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteLicense(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "License not found" });
      }
      
      res.json({ message: "License deleted successfully" });
    } catch (error) {
      console.error("Error deleting license:", error);
      res.status(500).json({ message: "Error deleting license" });
    }
  });

  // Get revenue analytics
  app.get("/api/analytics", async (req, res) => {
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

  // Split people management
  app.get("/api/split-people", async (req, res) => {
    try {
      const people = await storage.getAllSplitPeople();
      res.json(people);
    } catch (error) {
      console.error("Error fetching split people:", error);
      res.status(500).json({ message: "Error fetching split people" });
    }
  });

  app.post("/api/split-people", async (req, res) => {
    try {
      const data = insertSplitPersonSchema.parse(req.body);
      const person = await storage.createSplitPerson(data);
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

  app.delete("/api/split-people/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteSplitPerson(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Person not found" });
      }
      
      res.json({ message: "Person deleted successfully" });
    } catch (error) {
      console.error("Error deleting split person:", error);
      res.status(500).json({ message: "Error deleting split person" });
    }
  });

  // Check expiring licenses and send notifications
  app.post("/api/check-expiring", async (req, res) => {
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
      
      res.json({ notifiedCount });
    } catch (error) {
      console.error("Error checking expiring licenses:", error);
      res.status(500).json({ message: "Error checking expiring licenses" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
