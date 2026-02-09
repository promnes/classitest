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
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
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
