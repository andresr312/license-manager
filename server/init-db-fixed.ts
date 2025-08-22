import Database from "better-sqlite3";

const db = new Database("local.db");

db.exec(`
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS licenses;
DROP TABLE IF EXISTS split_people;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  name TEXT,
  role TEXT NOT NULL DEFAULT 'user'
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  username TEXT,
  action TEXT,
  details TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS licenses (
  id TEXT PRIMARY KEY,
  business_name TEXT NOT NULL,
  rif TEXT NOT NULL,
  expiration_epoch_day INTEGER NOT NULL,
  encoded_license TEXT NOT NULL,
  admin_password TEXT NOT NULL,
  direccion1 TEXT DEFAULT '',
  direccion2 TEXT DEFAULT '',
  direccion3 TEXT DEFAULT '',
  direccion4 TEXT DEFAULT '',
  license_type TEXT NOT NULL,
  hardware_id TEXT NOT NULL,
  creation_epoch_day INTEGER NOT NULL,
  cost REAL NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS split_people (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  percentage INTEGER NOT NULL
);
`);

// Eliminar usuario anterior si existe y crear usuario por defecto admin
db.prepare("DELETE FROM users WHERE username = ?").run("admin");
db.prepare("INSERT INTO users (id, username, password, name, role) VALUES (?, ?, ?, ?, ?)").run(
  "1",
  "admin",
  "admin123",
  "Administrador",
  "admin"
);

console.log("Tablas creadas y usuario por defecto insertado.");
