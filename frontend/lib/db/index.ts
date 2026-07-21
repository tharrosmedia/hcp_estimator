import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL || '';

if (!connectionString) {
  console.warn('⚠️  DATABASE_URL not set - DB operations will fail at runtime');
}

const neonClient = connectionString ? neon(connectionString) : null;

export const db = neonClient 
  ? drizzle(neonClient, { schema }) 
  : new Proxy({} as any, {
      get() { throw new Error('DATABASE_URL is not set'); }
    });

export const rawSql = neonClient;

export * from './schema';
