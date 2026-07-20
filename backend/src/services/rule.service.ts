import { db, installRules, linesetRules } from '../db';
import { InstallRule, LinesetRule } from '../../../shared/types';

export async function getInstallRules(): Promise<InstallRule[]> {
  return db.select().from(installRules);
}

export async function getLinesetRules(): Promise<LinesetRule[]> {
  return db.select().from(linesetRules);
}

export async function seedDefaultRules() {
  // Seed some sensible defaults (no hard coded markup etc)
  const existingInstall = await db.select().from(installRules).limit(1);
  if (existingInstall.length === 0) {
    await db.insert(installRules).values([
      { equipmentType: 'ductless_single', baseHours: 4, crewMultiplier: 1, notes: 'Single zone ductless' },
      { equipmentType: 'ductless_multi', baseHours: 6, crewMultiplier: 1, notes: 'Multi zone' },
      { equipmentType: 'lineset', baseHours: 1.5, crewMultiplier: 1, notes: 'Lineset run' },
    ]);
  }

  const existingLineset = await db.select().from(linesetRules).limit(1);
  if (existingLineset.length === 0) {
    await db.insert(linesetRules).values([
      { materialCategory: 'ductless', recommendedFt: 25, costPerFt: 6.5 },
      { materialCategory: 'accessory', recommendedFt: 15, costPerFt: 5 },
    ]);
  }
}
