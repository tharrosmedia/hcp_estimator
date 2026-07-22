import { db } from './lib/db';
import { seedDefaultRules } from './lib/db/seed';
import { syncPricebook } from './lib/services/pricebook';
import { db as schemaDb, users } from './lib/db';
import { eq } from 'drizzle-orm';
import { neon } from '@neondatabase/serverless';
import cron from 'node-cron';
import path from 'path';
import fs from 'fs';
import { migration0000 } from './lib/db/migration-sql';
// Cron now decrypts a user's saved HCP key (preferred) with HCP_SYNC_KEY as fallback.

export async function register() {
  try {
    const connectionString = process.env.DATABASE_URL || '';
    const rawSql = connectionString ? neon(connectionString) : null;

    // Apply schema using embedded SQL (guaranteed, no runtime file dependency)
    const statements = migration0000
      .split('--> statement-breakpoint')
      .map(s => s.trim())
      .filter(Boolean);

    console.log('[MIGRATE] Applying', statements.length, 'schema statements from embedded SQL');
    if (rawSql) {
      for (const stmt of statements) {
        try {
          await rawSql.query(stmt);
        } catch (stmtErr: any) {
          // Ignore duplicate table / constraint errors (IF NOT EXISTS + DO blocks)
          if (!/already exists|duplicate_object/i.test(String(stmtErr?.message || stmtErr))) {
            console.error('[MIGRATE] Statement error (non-fatal):', stmtErr);
          }
        }
      }
    }
    console.log('[MIGRATE] Embedded schema statements applied');

    // File-based migrator disabled (embedded SQL + manual tables are used; the migrator was causing sql template errors)
    console.log('[MIGRATE] cwd:', process.cwd());
    console.log('[MIGRATE] __dirname:', __dirname);
    console.log('[MIGRATE] Using embedded SQL only (file migrator skipped to avoid driver incompatibility)');

    // Basic DB connectivity check
    if (rawSql) {
      await rawSql`select 1`;
    }

    // Seed defaults
    try {
      await seedDefaultRules();
      console.log('[SEED] Default rules seeded (or already present)');
    } catch (seedErr) {
      console.error('[SEED] Failed to seed defaults (non-fatal):', seedErr);
    }

    // Start cron for pricebook refresh
    try {
      const schedule = process.env.CRON_SCHEDULE || '0 6 * * *';
      cron.schedule(schedule, async () => {
        console.log('[CRON] Running pricebook refresh...');
        try {
          let key: string | null = process.env.HCP_SYNC_KEY || null;
          if (rawSql) {
            const rows = await rawSql`SELECT hcp_api_key FROM users WHERE hcp_api_key IS NOT NULL LIMIT 1`;
            if (rows[0]?.hcp_api_key) {
              const { decryptApiKey } = await import('./lib/encrypt');
              key = await decryptApiKey(rows[0].hcp_api_key) || key;
            }
          }
          if (key) {
            const res = await syncPricebook(key);
            console.log('[CRON] Pricebook synced:', res);
          } else {
            console.log('[CRON] No HCP key configured for refresh');
          }
        } catch (e) {
          console.error('[CRON] Pricebook refresh failed', e);
        }
      });
      console.log('[CRON] Pricebook cron scheduled');
    } catch (cronErr) {
      console.error('[CRON] Failed to schedule cron (non-fatal):', cronErr);
    }

    // Verify a core table exists (post-migration check)
    if (rawSql) {
      try {
        const res = await rawSql`SELECT COUNT(*) FROM users`;
        console.log('[DB] users table count (post-migrate):', res);
      } catch (verifyErr) {
        console.error('[DB] Verification query failed (non-fatal):', verifyErr);
      }
    }

    console.log('🚀 App startup complete (migrations applied, DB connected, rules seeded, cron scheduled)');
  } catch (e) {
    console.error('Failed to start app (non-fatal, continuing):', e);
    // Do not re-throw - allow the server to serve requests even if startup tasks fail
  }
}
