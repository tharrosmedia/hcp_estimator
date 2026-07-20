import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { db, settings, installRules, linesetRules, users } from '../db';
import { eq } from 'drizzle-orm';

export const getSettings = async (req: AuthRequest, res: Response) => {
  const all = await db.select().from(settings);
  res.json(all);
};

export const updateSetting = async (req: AuthRequest, res: Response) => {
  const { key, value } = req.body;
  if (!key || value === undefined) return res.status(400).json({ error: 'key and value required' });

  const existing = await db.query.settings.findFirst({ where: eq(settings.key, key) });
  if (existing) {
    await db.update(settings).set({ value, updatedAt: new Date() }).where(eq(settings.key, key));
  } else {
    await db.insert(settings).values({ key, value });
  }
  res.json({ success: true });
};

export const getInstallRules = async (req: AuthRequest, res: Response) => {
  const rules = await db.select().from(installRules);
  res.json(rules);
};

export const upsertInstallRule = async (req: AuthRequest, res: Response) => {
  const { equipmentType, baseHours, crewMultiplier, notes } = req.body;
  // simple upsert logic
  const existing = await db.query.installRules.findFirst({ where: eq(installRules.equipmentType, equipmentType) });
  if (existing) {
    await db.update(installRules).set({ baseHours, crewMultiplier, notes }).where(eq(installRules.id, existing.id));
  } else {
    await db.insert(installRules).values({ equipmentType, baseHours, crewMultiplier, notes });
  }
  res.json({ success: true });
};

export const getUserHcpKey = async (req: AuthRequest, res: Response) => {
  const user = await db.query.users.findFirst({ where: eq(users.id, req.user!.userId) });
  res.json({ hasKey: !!user?.hcpApiKey });
};

export const setUserHcpKey = async (req: AuthRequest, res: Response) => {
  const { hcpApiKey } = req.body;
  await db.update(users).set({ hcpApiKey }).where(eq(users.id, req.user!.userId));
  res.json({ success: true });
};
