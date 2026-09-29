import { PGlite } from "@electric-sql/pglite";
import { Pool } from "pg";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { validateProductionConfig } from "./config.ts";

// Production must use persistent managed PostgreSQL and verified TLS.
validateProductionConfig(process.env);
const path =
  process.env.NODE_ENV === "test"
    ? "memory://"
    : process.env.DB_PATH || "./data/portal-db";
if (!process.env.DATABASE_URL) mkdirSync(dirname(path), { recursive: true });
const pool =
  process.env.DATABASE_URL && process.env.NODE_ENV !== "test"
    ? new Pool({ connectionString: process.env.DATABASE_URL, max: 5 })
    : null;
const local = pool ? null : new PGlite(path);
type SqlValue = string | number | boolean | null;
type DbRow = Record<string, unknown>;
function localDatabase() {
  if (!local) throw new Error("Local database is unavailable");
  return local;
}
export const db = {
  async query<Row extends DbRow = DbRow>(
    sql: string,
    values: SqlValue[] = [],
  ): Promise<{ rows: Row[] }> {
    if (pool) return pool.query<Row>(sql, values);
    const result = await localDatabase().query<Row>(sql, values);
    return { rows: result.rows };
  },
  async exec(sql: string) {
    if (pool) await pool.query(sql);
    else await localDatabase().exec(sql);
  },
  async close() {
    if (pool) await pool.end();
    else await localDatabase().close();
  },
};
