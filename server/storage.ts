import type { License, InsertLicense, SplitPerson, InsertSplitPerson } from "@shared/schema";
import { SQLiteStorage } from "./sqlite-storage";

export interface IStorage {
  // License operations
  getLicense(id: string): Promise<License | undefined>;
  getAllLicenses(): Promise<License[]>;
  createLicense(license: InsertLicense & { encodedLicense: string, creationEpochDay: number }): Promise<License>;
  updateLicense(id: string, updates: Partial<License>): Promise<License | undefined>;
  deleteLicense(id: string): Promise<boolean>;
  
  // Split people operations
  getAllSplitPeople(): Promise<SplitPerson[]>;
  createSplitPerson(person: InsertSplitPerson): Promise<SplitPerson>;
  deleteSplitPerson(id: string): Promise<boolean>;
  
  // Notification tracking
  getExpiredNotifications(): Promise<Map<string, number>>;
  setExpiredNotification(licenseId: string, epochDay: number): Promise<void>;
}

// Implementación persistente con SQLite
export class PersistentStorage extends SQLiteStorage implements IStorage {}

export const storage = new PersistentStorage();
