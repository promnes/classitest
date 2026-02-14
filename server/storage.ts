import { type Parent } from "@shared/schema";
import { randomUUID } from "crypto";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

const { Pool } = pg;

let dbInstance: any = null;

function getDb() {
  if (!dbInstance) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is not set");
    }
    const max = Math.max(5, Number(process.env["DB_POOL_MAX"] || "50"));
    const min = Math.max(0, Number(process.env["DB_POOL_MIN"] || "5"));
    const idleTimeoutMillis = Math.max(1000, Number(process.env["DB_POOL_IDLE_TIMEOUT_MS"] || "30000"));
    const connectionTimeoutMillis = Math.max(1000, Number(process.env["DB_POOL_CONNECT_TIMEOUT_MS"] || "10000"));

    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max,
      min,
      idleTimeoutMillis,
      connectionTimeoutMillis,
    });
    dbInstance = drizzle(pool);
  }
  return dbInstance;
}

export interface IStorage {
  db: any;
}

export class MemStorage implements IStorage {
  db: any;

  constructor() {
    this.db = getDb();
  }
}

export const storage = new MemStorage();
