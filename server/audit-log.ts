import { auditLogs } from "@shared/audit";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";

const db = new Database("../local.db");
export const orm = drizzle(db);

export type AuditLogParams = { user_id: string, username: string, action: string, details?: string };
export async function logAudit({ user_id, username, action, details }: AuditLogParams) {
  await orm.insert(auditLogs).values({
    id: uuidv4(),
    user_id,
    username,
    action,
    details: details || "",
  });
}
