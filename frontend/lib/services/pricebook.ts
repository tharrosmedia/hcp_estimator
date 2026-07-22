import { rawSql } from '@/lib/db';
import { fetchPricebookItems } from './hcp';
import { PricebookItem } from '@/lib/shared/types';

function mapPricebookItem(row: any): PricebookItem {
  if (!row) return null as any;
  return {
    id: row.id,
    hcpId: row.hcp_id,
    name: row.name,
    description: row.description,
    cost: row.cost,
    category: row.category,
    unit: row.unit,
    linesetFt: row.lineset_ft,
    linesetCost: row.lineset_cost,
    lastSyncedAt: row.last_synced_at,
  };
}

export async function syncPricebook(apiKey: string): Promise<{ synced: number }> {
  if (!rawSql) return { synced: 0 };
  const items = await fetchPricebookItems(apiKey);

  let synced = 0;

  for (const item of items) {
    if (!item.hcpId) continue;

    await rawSql.query(
      'INSERT INTO pricebook_items (hcp_id, name, description, cost, category, unit, lineset_ft, lineset_cost, last_synced_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW()) ON CONFLICT (hcp_id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, cost = EXCLUDED.cost, category = EXCLUDED.category, unit = EXCLUDED.unit, lineset_ft = EXCLUDED.lineset_ft, lineset_cost = EXCLUDED.lineset_cost, last_synced_at = NOW()',
      [item.hcpId, item.name, item.description, item.cost, item.category, item.unit, item.linesetFt, item.linesetCost]
    );
    synced++;
  }

  return { synced };
}

export async function getAllPricebookItems(): Promise<PricebookItem[]> {
  if (!rawSql) return [];
  const rows = await rawSql.query('SELECT * FROM pricebook_items ORDER BY name');
  return rows.map(mapPricebookItem);
}
