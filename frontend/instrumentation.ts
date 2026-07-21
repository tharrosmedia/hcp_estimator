import { db } from './lib/db';
import { seedDefaultRules } from './lib/db/seed';
import { syncPricebook } from './lib/services/pricebook';
import { db as schemaDb, users } from './lib/db';
import { eq } from 'drizzle-orm';
import cron from 'node-cron';

export async function register() {
  try {
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

    console.log('🚀 App startup complete (DB connected, rules seeded, cron scheduled)');
  } catch (e) {
    console.error('Failed to start app', e);
  }
}
