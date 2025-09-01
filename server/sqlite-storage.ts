import { drizzle } from 'drizzle-orm/better-sqlite3';
import { eq } from 'drizzle-orm';
import Database from 'better-sqlite3';
import { licenses, splitPeople, users, payments } from '@shared/schema';
import { v4 as uuidv4 } from 'uuid';
import type { Payment, InsertPayment } from '@shared/schema';
import type { License, InsertLicense, SplitPerson, InsertSplitPerson, User, InsertUser } from '@shared/schema';

//const db = Database("local.db");
const db = Database("/root/license-manager/local.db");
export const orm = drizzle(db);

export class SQLiteStorage {

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await orm.select().from(users).where(eq(users.username, username));
    return result[0];
  }

  async loginUser(username: string, password: string): Promise<User | undefined> {
    const user = await this.getUserByUsername(username);
    if (user && user.password === password) {
      return user;
    }
    return undefined;
  }

  async createUser(user: InsertUser): Promise<User> {
    const userWithId = {
      ...user,
      id: user.id ?? uuidv4(),
    };
    const [created] = await orm.insert(users).values(userWithId).returning();
    return created;
  }

  async getAllUsers(): Promise<User[]> {
    return await orm.select().from(users);
  }
  // License operations
  async getLicense(id: string): Promise<License | undefined> {
    const result = await orm.select().from(licenses).where(eq(licenses.id, id));
    return result[0];
  }

  async getAllLicenses(): Promise<License[]> {
    return await orm.select().from(licenses);
  }

  async createLicense(license: InsertLicense & { encodedLicense: string, creationEpochDay: number }): Promise<License> {
    const licenseWithId = {
      ...license,
      id: license.id ?? uuidv4(),
    };
    const [created] = await orm.insert(licenses).values(licenseWithId).returning();
    return created;
  }

  async updateLicense(id: string, updates: Partial<License>): Promise<License | undefined> {
    const [updated] = await orm.update(licenses).set(updates).where(eq(licenses.id, id)).returning();
    return updated;
  }

  async deleteLicense(id: string): Promise<boolean> {
    const result = await orm.delete(licenses).where(eq(licenses.id, id));
    return result.changes > 0;
  }

  // Split people operations
  async getAllSplitPeople(): Promise<SplitPerson[]> {
    return await orm.select().from(splitPeople);
  }

  async createSplitPerson(person: InsertSplitPerson): Promise<SplitPerson> {
    const personWithId = {
      ...person,
      id: person.id ?? uuidv4(),
    };
    const [created] = await orm.insert(splitPeople).values(personWithId).returning();
    return created;
  }

  async deleteSplitPerson(id: string): Promise<boolean> {
    const result = await orm.delete(splitPeople).where(eq(splitPeople.id, id));
    return result.changes > 0;
  }

  // Notification tracking (simple implementation)
  async getExpiredNotifications(): Promise<Map<string, number>> {
    // Implement with a table if needed
    return new Map();
  }
  async setExpiredNotification(licenseId: string, epochDay: number): Promise<void> {
    // Implement with a table if needed
  }

  // Payments operations
  async createPayment(payment: InsertPayment): Promise<Payment> {
    const paymentWithId = {
      ...payment,
      id: payment.id ?? uuidv4(),
    };
    const [created] = await orm.insert(payments).values(paymentWithId).returning();
    return created;
  }

  async getAllPayments(status?: string): Promise<Payment[]> {
    if (status) {
      return await orm.select().from(payments).where(eq(payments.status, status));
    }
    return await orm.select().from(payments);
  }

  async updatePaymentStatus(id: string, status: string, paidBy?: string): Promise<Payment | undefined> {
    const updateData: Partial<Payment> = { status };
    if (status === 'cobrado') {
      updateData.paidAt = Date.now();
      if (paidBy) updateData.paidBy = paidBy;
    }
    const [updated] = await orm.update(payments).set(updateData).where(eq(payments.id, id)).returning();
    return updated;
  }

  async deletePayment(id: string): Promise<boolean> {
    const result = await orm.delete(payments).where(eq(payments.id, id));
    // better-sqlite3 returns an object with 'changes' property
    return result && typeof result.changes === 'number' ? result.changes > 0 : false;
  }
}
