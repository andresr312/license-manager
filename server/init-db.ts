import Database from "better-sqlite3";

const db = new Database("local.db");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  name TEXT
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  userId TEXT,
  username TEXT,
  action TEXT,
  details TEXT,
  createdAt TEXT DEFAULT (datetime('now'))
);
`);

// Crear usuario por defecto si no existe
const exists = db.prepare("SELECT 1 FROM users WHERE username = ?").get("admin");
if (!exists) {
  db.prepare("INSERT INTO users (id, username, password, name) VALUES (?, ?, ?, ?)").run(
    "1",
    "admin",
    "admin123",
    "Administrador"
  );
}

console.log("Tablas creadas y usuario por defecto insertado.");
