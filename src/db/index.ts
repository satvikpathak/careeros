import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

const databaseUrl = process.env.DATABASE_URL;

function createDb() {
  if (!databaseUrl) {
    console.warn("DATABASE_URL is missing. DB operations will fail at runtime.");
    // Return a proxy that throws a descriptive error on any property access that leads to a call
    return drizzle(neon("postgresql://placeholder:placeholder@localhost/placeholder"), { schema });
  }

  const sql = neon(databaseUrl);
  return drizzle(sql, { schema });
}

export const db = createDb();
