import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as pricebookService from '../services/pricebook.service';
import { syncPricebook } from '../services/pricebook.service';
import { db, users } from '../db';
import { eq } from 'drizzle-orm';

export const getPricebook = async (req: AuthRequest, res: Response) => {
  const items = await pricebookService.getAllPricebookItems();
  res.json(items);
};

export const refreshPricebook = async (req: AuthRequest, res: Response) => {
  try {
    const user = await db.query.users.findFirst({ where: eq(users.id, req.user!.userId) });
    const key = user?.hcpApiKey || process.env.HCP_SYNC_KEY;
    if (!key) {
      return res.status(400).json({ error: 'No HCP API key available for sync' });
    }
    const result = await syncPricebook(key);
    res.json({ success: true, ...result });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
};
