import "server-only";
import { Pool, type PoolClient } from "pg";

type SqlParams = Array<string | number | null>;

declare global {
  var __shopPool: Pool | undefined;
}

const SESSION_POOLER_HINT =
  "Your DATABASE_URL uses the Direct connection host (db.*.supabase.co). On many networks (campus WiFi, IPv4-only) DNS fails with ENOTFOUND because that hostname is often IPv6-only. Fix: Supabase → Project Settings → Database → Connection string → choose Session pooler (Session mode, port 5432). The host must be aws-0-<region>.pooler.supabase.com — not db.<ref>.supabase.co. Paste the new URI into .env.local and restart the dev server.";

function rethrowWithConnectionHint(err: unknown): never {
  if (err && typeof err === "object" && "code" in err) {
    const e = err as NodeJS.ErrnoException & { hostname?: string };
    const msg = String(e.message ?? "");
    const host = e.hostname ?? "";
    const looksSupabase =
      host.includes("supabase") || msg.includes("supabase.co");
    if (e.code === "ENOTFOUND" && looksSupabase) {
      throw new Error(`${SESSION_POOLER_HINT}\n\nOriginal error: ${msg}`);
    }
  }
  throw err;
}

async function runQuery(sql: string, params: SqlParams = []) {
  try {
    return await getPool().query(sql, params);
  } catch (e) {
    rethrowWithConnectionHint(e);
    throw e;
  }
}

function poolOptions(connectionString: string) {
  // Supabase uses TLS; Windows / some networks need explicit SSL. Pooler hostnames
  // are still valid for server verification, but rejectUnauthorized:false avoids
  // rare cert chain issues in local dev (override with DATABASE_SSL_STRICT=1).
  const strict =
    process.env.DATABASE_SSL_STRICT === "1" || process.env.DATABASE_SSL_STRICT === "true";
  const isSupabase =
    connectionString.includes("supabase") || connectionString.includes("pooler.supabase.com");

  return {
    connectionString,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 20_000,
    // node-pg + Supabase: enable SSL when URI uses sslmode=require or host is Supabase
    ssl:
      connectionString.includes("sslmode=require") || isSupabase
        ? strict
          ? { rejectUnauthorized: true }
          : { rejectUnauthorized: false }
        : undefined,
  };
}

function getPool(): Pool {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. In Supabase: Project Settings → Database → Connection string → URI. Copy into .env.local and restart `npm run dev`.",
    );
  }
  if (!global.__shopPool) {
    if (process.env.NODE_ENV === "development" && url.includes(":6543")) {
      console.warn(
        "[db] DATABASE_URL uses port 6543 (transaction pooler). If you see prepared-statement or PgBouncer errors, switch to the Session pooler or Direct connection string (port 5432) in Supabase.",
      );
    }
    if (
      process.env.NODE_ENV === "development" &&
      /db\.[^.]+\.supabase\.co/i.test(url)
    ) {
      console.warn(
        "[db] DATABASE_URL uses Direct connection (db.*.supabase.co). If you get ENOTFOUND, switch to Session pooler — see .env.example.",
      );
    }
    global.__shopPool = new Pool(poolOptions(url));
  }
  return global.__shopPool;
}

export async function selectAll<T>(sql: string, params: SqlParams = []): Promise<T[]> {
  const result = await runQuery(sql, params);
  return result.rows as T[];
}

export async function selectOne<T>(sql: string, params: SqlParams = []): Promise<T | undefined> {
  const result = await runQuery(sql, params);
  return result.rows[0] as T | undefined;
}

export async function runStatement(sql: string, params: SqlParams = []) {
  return runQuery(sql, params);
}

export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  let client: PoolClient | undefined;
  try {
    client = await getPool().connect();
    await client.query("BEGIN");
    const out = await fn(client);
    await client.query("COMMIT");
    return out;
  } catch (e) {
    await client?.query("ROLLBACK").catch(() => {});
    rethrowWithConnectionHint(e);
    throw e;
  } finally {
    client?.release();
  }
}
