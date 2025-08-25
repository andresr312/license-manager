// Tabla de pagos
export const payments = pgTable("payments", {
  id: varchar("id").primaryKey(),
  licenseId: varchar("license_id").notNull(),
  amount: real("amount").notNull(),
  method: text("method").notNull(),
  status: text("status").notNull().default("por cobrar"), // por cobrar, cobrado
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  paidAt: bigint("paid_at", { mode: "number" }),
  paidBy: varchar("paid_by"), // id del usuario que marcó como pagado
  reference: text("reference"), // opcional
  notes: text("notes"), // opcional
});

// ...existing code...
export const insertPaymentSchema = createInsertSchema(payments).omit({ id: true });

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema> & { id?: string };
import { sql } from "drizzle-orm";
import { pgTable, text, varchar, real, bigint, integer } from "drizzle-orm/pg-core";
// Tabla de usuarios
export const users = pgTable("users", {
  id: varchar("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name"),
  role: text("role").notNull().default("user"), // 'admin' o 'user'
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true });

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema> & { id?: string; role?: string };
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const licenses = pgTable("licenses", {
  id: varchar("id").primaryKey(),
  businessName: text("business_name").notNull(),
  rif: text("rif").notNull(),
  expirationEpochDay: bigint("expiration_epoch_day", { mode: "number" }).notNull(),
  encodedLicense: text("encoded_license").notNull(),
  adminPassword: text("admin_password").notNull(),
  direccion1: text("direccion1").default(""),
  direccion2: text("direccion2").default(""),
  direccion3: text("direccion3").default(""),
  direccion4: text("direccion4").default(""),
  licenseType: text("license_type").notNull(),
  hardwareId: text("hardware_id").default(""),
  creationEpochDay: bigint("creation_epoch_day", { mode: "number" }).notNull(),
  cost: real("cost").notNull().default(0),
});

export const splitPeople = pgTable("split_people", {
  id: varchar("id").primaryKey(),
  name: text("name").notNull(),
  percentage: integer("percentage").notNull(),
});

export const insertLicenseSchema = createInsertSchema(licenses).partial({ id: true }).omit({
  encodedLicense: true,
  creationEpochDay: true,
});

export const insertSplitPersonSchema = createInsertSchema(splitPeople).omit({
  id: true,
});

export type License = typeof licenses.$inferSelect;
export type InsertLicense = z.infer<typeof insertLicenseSchema>;
export type SplitPerson = typeof splitPeople.$inferSelect;
export type InsertSplitPerson = z.infer<typeof insertSplitPersonSchema> & { id?: string };

// Additional types for frontend
export type LicenseWithStatus = License & {
  status: 'active' | 'expiring' | 'expired';
  daysRemaining: number;
};

export type RevenueAnalytics = {
  totalRevenue: number;
  monthlyRevenue: number;
  weeklyRevenue: number;
  totalLicenses: number;
  activeLicenses: number;
  expiringLicenses: number;
  expiredLicenses: number;
};
