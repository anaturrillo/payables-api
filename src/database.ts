import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.resolve(process.cwd(), "payables.db");

const db = new Database(DB_PATH);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS cost_centers (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    code        TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL DEFAULT '',
    status      TEXT NOT NULL DEFAULT 'active',
    created_at  TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS approvers (
    id             TEXT PRIMARY KEY,
    name           TEXT NOT NULL,
    email          TEXT NOT NULL UNIQUE,
    approval_limit REAL,
    password_hash  TEXT NOT NULL DEFAULT '',
    status         TEXT NOT NULL DEFAULT 'active',
    created_at     TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS products (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    aliases     TEXT NOT NULL DEFAULT '[]',
    description TEXT NOT NULL DEFAULT '',
    status      TEXT NOT NULL DEFAULT 'active',
    created_at  TEXT NOT NULL
  );
`);

// Migrations for existing databases
try { db.exec("ALTER TABLE approvers ADD COLUMN password_hash TEXT NOT NULL DEFAULT ''"); } catch {}
try { db.exec("ALTER TABLE approvers DROP COLUMN cost_center_id"); } catch {}

export default db;
