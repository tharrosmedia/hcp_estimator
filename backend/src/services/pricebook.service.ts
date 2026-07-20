import { db, pricebookItems } from '../db';
import { eq } from 'drizzle-orm';
import { fetchPricebookItems } from './hcp.service';
import { PricebookItem } from '../../../shared/types';

export async function syncPricebook(apiKey: string): Promise<{ synced: number }> {
  const items = await fetchPricebookItems(apiKey);

  let synced = 0;

  for (const item of items) {
    const existing = await db.query.pricebookItems.findFirst({
      where: eq(pricebookItems.hcpId, item.hcpId || ''),
    });

    const data = {
      hcpId: item.hcpId,
      name: item.name,
      description: item.description,
      cost: item.cost,
      category: item.category,
      unit: item.unit,
      linesetFt: item.linesetFt,
      linesetCost: item.linesetCost,
      lastSyncedAt: new Date(),
    };

    if (existing) {
      await db.update(pricebookItems).set(data).where(eq(pricebookItems.id, existing.id));
    } else {
      await db.insert(pricebookItems).values(data);
    }
    synced++;
  }

  return { synced };
}

export async function getAllPricebookItems(): Promise<PricebookItem[]> {
  return db.select().from(pricebookItems);
}
