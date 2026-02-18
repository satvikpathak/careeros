import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

const databaseUrl = process.env.DATABASE_URL;

// Create a function to get the db instance, or a dummy if we're in build time
function createDb() {
  if (!databaseUrl) {
    if (process.env.NODE_ENV === "production" && typeof window === "undefined") {
      console.warn("DATABASE_URL is missing. DB operations will fail.");
    }
    // Return a dummy object or throw a descriptive error on access
    // For build-time static generation, we might need a workaround
    return drizzle(neon("http://placeholder-url-for-build-time"), { schema });
  }

  const sql = neon(databaseUrl);
  return drizzle(sql, { schema });
}

export const db = createDb();
