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
    id            TEXT PRIMARY KEY,
    name          TEXT NOT NULL,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL DEFAULT '',
    status        TEXT NOT NULL DEFAULT 'active',
    created_at    TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS cost_center_approvers (
    id              TEXT PRIMARY KEY,
    cost_center_id  TEXT NOT NULL REFERENCES cost_centers(id) ON DELETE CASCADE,
    approver_id     TEXT NOT NULL REFERENCES approvers(id) ON DELETE CASCADE,
    min_amount      REAL,
    max_amount      REAL,
    UNIQUE(cost_center_id, approver_id)
  );

  CREATE TABLE IF NOT EXISTS products (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    aliases     TEXT NOT NULL DEFAULT '[]',
    description TEXT NOT NULL DEFAULT '',
    category    TEXT NOT NULL DEFAULT 'other',
    status      TEXT NOT NULL DEFAULT 'active',
    created_at  TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS approval_rules (
    id                  TEXT PRIMARY KEY,
    cost_center_id      TEXT NOT NULL REFERENCES cost_centers(id) ON DELETE CASCADE,
    name                TEXT NOT NULL,
    flow_type           TEXT NOT NULL DEFAULT 'parallel',
    condition_logic     TEXT NOT NULL DEFAULT 'and',
    required_approvals  INTEGER NOT NULL DEFAULT 1,
    position            INTEGER NOT NULL DEFAULT 0,
    created_at          TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS rule_conditions (
    id        TEXT PRIMARY KEY,
    rule_id   TEXT NOT NULL REFERENCES approval_rules(id) ON DELETE CASCADE,
    type      TEXT NOT NULL,
    operator  TEXT NOT NULL,
    value     TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS rule_approvers (
    id           TEXT PRIMARY KEY,
    rule_id      TEXT NOT NULL REFERENCES approval_rules(id) ON DELETE CASCADE,
    approver_id  TEXT NOT NULL REFERENCES approvers(id) ON DELETE CASCADE,
    order_index  INTEGER NOT NULL DEFAULT 0,
    UNIQUE(rule_id, approver_id)
  );
`);

// Migrations for existing databases
try { db.exec("ALTER TABLE approvers ADD COLUMN password_hash TEXT NOT NULL DEFAULT ''"); } catch {}
try { db.exec("ALTER TABLE approvers DROP COLUMN cost_center_id"); } catch {}
try { db.exec("ALTER TABLE approvers DROP COLUMN approval_limit"); } catch {}
try { db.exec("ALTER TABLE products ADD COLUMN category TEXT NOT NULL DEFAULT 'other'"); } catch {}
try { db.exec("ALTER TABLE approval_rules ADD COLUMN condition_logic TEXT NOT NULL DEFAULT 'and'"); } catch {}

export default db;
