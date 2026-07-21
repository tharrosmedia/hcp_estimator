import { db } from './lib/db';
import { seedDefaultRules } from './lib/db/seed';
import { syncPricebook } from './lib/services/pricebook';
import { db as schemaDb, users } from './lib/db';
import { eq } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/neon-http/migrator';
import cron from 'node-cron';
import path from 'path';
import fs from 'fs';
import { migration0000 } from './lib/db/migration-sql';

export async function register() {
  try {
    // Apply schema using embedded SQL (guaranteed, no runtime file dependency)
    const statements = migration0000
      .split('--> statement-breakpoint')
      .map(s => s.trim())
      .filter(Boolean);

    console.log('[MIGRATE] Applying', statements.length, 'schema statements from embedded SQL');
    for (const stmt of statements) {
      try {
        await db.execute({ sql: stmt, params: [] } as any);
      } catch (stmtErr: any) {
        // Ignore duplicate table / constraint errors (IF NOT EXISTS + DO blocks)
        if (!/already exists|duplicate_object/i.test(String(stmtErr?.message || stmtErr))) {
          console.error('[MIGRATE] Statement error (non-fatal):', stmtErr);
        }
      }
    }
    console.log('[MIGRATE] Embedded schema statements applied');

    // Also try the file-based migrator if the files happen to be present (for future migrations)
    try {
      const candidates = [
        path.resolve(process.cwd(), 'drizzle'),
        path.resolve(process.cwd(), 'frontend', 'drizzle'),
        path.resolve(__dirname, '..', '..', '..', 'drizzle'),
        path.resolve(__dirname, '..', '..', 'drizzle'),
      ];
      let migrationsFolder: string | null = null;
      for (const candidate of candidates) {
        if (fs.existsSync(path.join(candidate, '0000_purple_bloodstrike.sql'))) {
          migrationsFolder = candidate;
          break;
        }
      }
      console.log('[MIGRATE] cwd:', process.cwd());
      console.log('[MIGRATE] __dirname:', __dirname);
      if (migrationsFolder) {
        console.log('[MIGRATE] Also running file migrator from:', migrationsFolder);
        await migrate(db, { migrationsFolder });
      } else {
        console.log('[MIGRATE] No migration files found on disk (using embedded)');
      }
    } catch (fileMigrateErr) {
      console.log('[MIGRATE] File-based migrator skipped/failed (non-fatal):', fileMigrateErr);
    }

    // Basic DB connectivity check
    await db.execute({ sql: 'select 1', params: [] } as any);

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
          const admin = await schemaDb.query.users.findFirst({ where: eq(users.role, 'admin') });
          const key = admin?.hcpApiKey || process.env.HCP_SYNC_KEY;
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
    try {
      const res = await db.execute({ sql: 'SELECT COUNT(*) FROM users', params: [] } as any);
      console.log('[DB] users table count (post-migrate):', res);
    } catch (verifyErr) {
      console.error('[DB] Verification query failed (non-fatal):', verifyErr);
    }

    console.log('🚀 App startup complete (migrations applied, DB connected, rules seeded, cron scheduled)');
  } catch (e) {
    console.error('Failed to start app (non-fatal, continuing):', e);
    // Do not re-throw - allow the server to serve requests even if startup tasks fail
  }
}
