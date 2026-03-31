import "server-only";
import Database from "better-sqlite3";
import path from "node:path";

const DB_PATH = path.join(process.cwd(), "shop.db");

type SqlParams = Array<string | number | null>;

declare global {
  // eslint-disable-next-line no-var
  var __shopDb: Database.Database | undefined;
}

function createDb() {
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      price_cents INTEGER NOT NULL,
      stock INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'NEW',
      total_cents INTEGER NOT NULL DEFAULT 0,
      priority_score REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id)
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price_cents INTEGER NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id),
      FOREIGN KEY (product_id) REFERENCES products(id)
    );
  `);

  const customerCount = db.prepare("SELECT COUNT(*) as count FROM customers").get() as {
    count: number;
  };

  if (customerCount.count === 0) {
    const insertCustomer = db.prepare(
      "INSERT INTO customers (name, email) VALUES (?, ?)",
    );
    const insertProduct = db.prepare(
      "INSERT INTO products (name, price_cents, stock) VALUES (?, ?, ?)",
    );

    const seed = db.transaction(() => {
      insertCustomer.run("Alice Carter", "alice@example.com");
      insertCustomer.run("Bob Singh", "bob@example.com");
      insertCustomer.run("Charlie Nguyen", "charlie@example.com");

      insertProduct.run("Notebook", 699, 120);
      insertProduct.run("Pen Set", 499, 80);
      insertProduct.run("Backpack", 4599, 30);
      insertProduct.run("Water Bottle", 1599, 45);
    });

    seed();
  }

  return db;
}

export function getDb() {
  if (!global.__shopDb) {
    global.__shopDb = createDb();
  }
  return global.__shopDb;
}

export function selectAll<T>(sql: string, params: SqlParams = []) {
  return getDb().prepare(sql).all(...params) as T[];
}

export function selectOne<T>(sql: string, params: SqlParams = []) {
  return getDb().prepare(sql).get(...params) as T | undefined;
}

export function runStatement(sql: string, params: SqlParams = []) {
  return getDb().prepare(sql).run(...params);
}
