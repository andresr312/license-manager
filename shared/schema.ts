import { sql } from "drizzle-orm";
import { pgTable, text, varchar, real, bigint, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const licenses = pgTable("licenses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
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
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  percentage: integer("percentage").notNull(),
});

export const insertLicenseSchema = createInsertSchema(licenses).omit({
  id: true,
  encodedLicense: true,
  creationEpochDay: true,
});

export const insertSplitPersonSchema = createInsertSchema(splitPeople).omit({
  id: true,
});

export type License = typeof licenses.$inferSelect;
export type InsertLicense = z.infer<typeof insertLicenseSchema>;
export type SplitPerson = typeof splitPeople.$inferSelect;
export type InsertSplitPerson = z.infer<typeof insertSplitPersonSchema>;

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
