import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

const databaseUrl = process.env.DATABASE_URL;

function createDb() {
  if (!databaseUrl) {
    console.warn("DATABASE_URL is missing. DB operations will fail at runtime.");
    return new Proxy({} as ReturnType<typeof drizzle>, {
      get() {
        throw new Error("DATABASE_URL is missing. Set it in your environment before using the database.");
      },
    });
  }

  const sql = neon(databaseUrl);
  return drizzle(sql, { schema });
}

export const db = createDb();
