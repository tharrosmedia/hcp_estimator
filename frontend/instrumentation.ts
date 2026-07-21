import { db } from './lib/db';
import { seedDefaultRules } from './lib/db/seed';
import { syncPricebook } from './lib/services/pricebook';
import { db as schemaDb, users } from './lib/db';
import { eq } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/neon-http/migrator';
import cron from 'node-cron';
import path from 'path';
import fs from 'fs';

export async function register() {
  try {
    // Apply any pending migrations (this makes schema updates ongoing)
    // Robust resolution for monorepo + Railway / Next production layouts
    const candidates = [
      path.resolve(process.cwd(), 'drizzle'),
      path.resolve(process.cwd(), 'frontend', 'drizzle'),
      // When running from .next/server/instrumentation.js
      path.resolve(__dirname, '..', '..', '..', 'drizzle'),
      path.resolve(__dirname, '..', '..', 'drizzle'),
    ];
    let migrationsFolder = candidates[0];
    for (const candidate of candidates) {
      const sqlPath = path.join(candidate, '0000_purple_bloodstrike.sql');
      if (fs.existsSync(sqlPath)) {
        migrationsFolder = candidate;
        break;
      }
    }
    console.log('[MIGRATE] cwd:', process.cwd());
    console.log('[MIGRATE] __dirname:', __dirname);
    console.log('[MIGRATE] Using migrations folder:', migrationsFolder);
    console.log('[MIGRATE] sql file exists:', fs.existsSync(path.join(migrationsFolder, '0000_purple_bloodstrike.sql')));
    await migrate(db, { migrationsFolder });

    // Basic DB connectivity check
    await db.execute({ sql: 'select 1', params: [] } as any);

    // Seed defaults
    await seedDefaultRules();

    // Start cron for pricebook refresh
    const schedule = process.env.CRON_SCHEDULE || '0 6 * * *';
    cron.schedule(schedule, async () => {
      console.log('[CRON] Running pricebook refresh...');
      try {
        // Use a system key or first admin's key
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

    // Verify a core table exists (post-migration check)
    try {
      const res = await db.execute({ sql: 'SELECT COUNT(*) FROM users', params: [] } as any);
      console.log('[DB] users table count (post-migrate):', res);
    } catch (verifyErr) {
      console.error('[DB] Verification query failed (tables may not exist):', verifyErr);
      throw verifyErr;
    }

    console.log('🚀 App startup complete (migrations applied, DB connected, rules seeded, cron scheduled)');
  } catch (e) {
    console.error('Failed to start app', e);
    // Re-throw so Railway sees the failure and doesn't silently start without DB
    throw e;
  }
}
