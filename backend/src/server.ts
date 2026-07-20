import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import routes from './routes';
import { env } from './config/env';
import { db } from './db';
import { seedDefaultRules } from './services/rule.service';
import cron from 'node-cron';
import { syncPricebook } from './services/pricebook.service';
import { users } from './db/schema';
import { eq } from 'drizzle-orm';

dotenv.config();

const app = express();

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.use('/api', routes);

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = env.PORT;

async function start() {
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
        const admin = await db.query.users.findFirst({ where: eq(users.role, 'admin') });
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

    app.listen(PORT, () => {
      console.log(`🚀 Backend running on http://localhost:${PORT}`);
      console.log(`   Health: http://localhost:${PORT}/health`);
    });
  } catch (e) {
    console.error('Failed to start server', e);
    process.exit(1);
  }
}

start();
