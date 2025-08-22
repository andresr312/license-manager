import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp } from "drizzle-orm/pg-core";

export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey(),
  user_id: varchar("user_id"),
  username: text("username"),
  action: text("action"),
  details: text("details"),
  created_at: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});
