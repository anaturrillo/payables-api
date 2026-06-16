import Database from "better-sqlite3";
import path from "path";
import { randomUUID } from "crypto";

const DB_PATH = process.env.DB_PATH || path.resolve(process.cwd(), "payables.db");

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
    group_logic         TEXT NOT NULL DEFAULT 'and',
    required_approvals  INTEGER NOT NULL DEFAULT 1,
    position            INTEGER NOT NULL DEFAULT 0,
    created_at          TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS rule_condition_groups (
    id          TEXT PRIMARY KEY,
    rule_id     TEXT NOT NULL REFERENCES approval_rules(id) ON DELETE CASCADE,
    logic       TEXT NOT NULL DEFAULT 'or',
    order_index INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS rule_conditions (
    id        TEXT PRIMARY KEY,
    group_id  TEXT REFERENCES rule_condition_groups(id) ON DELETE CASCADE,
    rule_id   TEXT,
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

  CREATE TABLE IF NOT EXISTS bills (
    id              TEXT PRIMARY KEY,
    number          TEXT,
    supplier        TEXT NOT NULL DEFAULT '',
    amount          REAL NOT NULL DEFAULT 0,
    invoice_date    TEXT,
    due_date        TEXT,
    payment_date    TEXT,
    status          TEXT NOT NULL DEFAULT 'initiated',
    image_path      TEXT,
    cost_center_id  TEXT REFERENCES cost_centers(id) ON DELETE SET NULL,
    created_at      TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS bill_items (
    id          TEXT PRIMARY KEY,
    bill_id     TEXT NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
    product_id  TEXT REFERENCES products(id) ON DELETE SET NULL,
    description TEXT NOT NULL DEFAULT '',
    quantity    REAL NOT NULL DEFAULT 1,
    unit_price  REAL NOT NULL DEFAULT 0,
    total       REAL NOT NULL DEFAULT 0,
    order_index INTEGER NOT NULL DEFAULT 0
  );
`);

try { db.exec("ALTER TABLE approvers ADD COLUMN password_hash TEXT NOT NULL DEFAULT ''"); } catch {}
try { db.exec("ALTER TABLE approvers DROP COLUMN cost_center_id"); } catch {}
try { db.exec("ALTER TABLE approvers DROP COLUMN approval_limit"); } catch {}
try { db.exec("ALTER TABLE products ADD COLUMN category TEXT NOT NULL DEFAULT 'other'"); } catch {}
try { db.exec("ALTER TABLE bills ADD COLUMN rule_id TEXT"); } catch {}
try { db.exec("ALTER TABLE bills ADD COLUMN approval_reasoning TEXT"); } catch {}
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS bill_approvers (
      id          TEXT PRIMARY KEY,
      bill_id     TEXT NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
      approver_id TEXT NOT NULL REFERENCES approvers(id) ON DELETE CASCADE,
      order_index INTEGER NOT NULL DEFAULT 0
    )
  `);
} catch {}

try { db.exec("ALTER TABLE approval_rules ADD COLUMN group_logic TEXT NOT NULL DEFAULT 'and'"); } catch {}
try {
  db.exec("UPDATE approval_rules SET group_logic = condition_logic WHERE group_logic = 'and' AND condition_logic IS NOT NULL");
  db.exec("ALTER TABLE approval_rules DROP COLUMN condition_logic");
} catch {}

const condCols = (db.prepare("PRAGMA table_info(rule_conditions)").all() as { name: string; notnull: number }[]);
const ruleIdCol = condCols.find(c => c.name === "rule_id");
if (ruleIdCol?.notnull) {
  db.pragma("foreign_keys = OFF");
  db.transaction(() => {
    db.exec(`
      CREATE TABLE rule_conditions_v2 (
        id        TEXT PRIMARY KEY,
        group_id  TEXT REFERENCES rule_condition_groups(id) ON DELETE CASCADE,
        rule_id   TEXT,
        type      TEXT NOT NULL,
        operator  TEXT NOT NULL,
        value     TEXT NOT NULL
      );
      INSERT INTO rule_conditions_v2 (id, rule_id, type, operator, value)
        SELECT id, rule_id, type, operator, value FROM rule_conditions;
      DROP TABLE rule_conditions;
      ALTER TABLE rule_conditions_v2 RENAME TO rule_conditions;
    `);
  })();
  db.pragma("foreign_keys = ON");
}

const orphaned = db.prepare(
  "SELECT DISTINCT rule_id FROM rule_conditions WHERE group_id IS NULL AND rule_id IS NOT NULL"
).all() as { rule_id: string }[];

if (orphaned.length > 0) {
  db.transaction(() => {
    for (const { rule_id } of orphaned) {
      const rule = db.prepare("SELECT group_logic FROM approval_rules WHERE id = ?").get(rule_id) as { group_logic: string } | undefined;
      const groupId = randomUUID();
      db.prepare("INSERT INTO rule_condition_groups (id, rule_id, logic, order_index) VALUES (?, ?, ?, 0)")
        .run(groupId, rule_id, rule?.group_logic ?? "or");
      db.prepare("UPDATE rule_conditions SET group_id = ? WHERE rule_id = ? AND group_id IS NULL")
        .run(groupId, rule_id);
    }
  })();
}

export default db;
