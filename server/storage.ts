import type { License, InsertLicense, SplitPerson, InsertSplitPerson } from "@shared/schema";
import { randomUUID } from "crypto";

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

export class MemStorage implements IStorage {
  private licenses: Map<string, License>;
  private splitPeople: Map<string, SplitPerson>;
  private expiredNotifications: Map<string, number>;

  constructor() {
    this.licenses = new Map();
    this.splitPeople = new Map();
    this.expiredNotifications = new Map();
  }

  async getLicense(id: string): Promise<License | undefined> {
    return this.licenses.get(id);
  }

  async getAllLicenses(): Promise<License[]> {
    return Array.from(this.licenses.values());
  }

  async createLicense(licenseData: InsertLicense & { encodedLicense: string, creationEpochDay: number }): Promise<License> {
    const id = randomUUID();
    const license: License = { 
      ...licenseData,
      id,
      direccion1: licenseData.direccion1 || "",
      direccion2: licenseData.direccion2 || "",
      direccion3: licenseData.direccion3 || "",
      direccion4: licenseData.direccion4 || "",
      hardwareId: licenseData.hardwareId || "",
      cost: licenseData.cost || 0,
    };
    this.licenses.set(id, license);
    return license;
  }

  async updateLicense(id: string, updates: Partial<License>): Promise<License | undefined> {
    const existing = this.licenses.get(id);
    if (!existing) return undefined;
    
    const updated = { ...existing, ...updates };
    this.licenses.set(id, updated);
    return updated;
  }

  async deleteLicense(id: string): Promise<boolean> {
    return this.licenses.delete(id);
  }

  async getAllSplitPeople(): Promise<SplitPerson[]> {
    return Array.from(this.splitPeople.values());
  }

  async createSplitPerson(personData: InsertSplitPerson): Promise<SplitPerson> {
    const id = randomUUID();
    const person: SplitPerson = { ...personData, id };
    this.splitPeople.set(id, person);
    return person;
  }

  async deleteSplitPerson(id: string): Promise<boolean> {
    return this.splitPeople.delete(id);
  }

  async getExpiredNotifications(): Promise<Map<string, number>> {
    return new Map(this.expiredNotifications);
  }

  async setExpiredNotification(licenseId: string, epochDay: number): Promise<void> {
    this.expiredNotifications.set(licenseId, epochDay);
  }
}

export const storage = new MemStorage();
