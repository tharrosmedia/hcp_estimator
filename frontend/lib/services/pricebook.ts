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

export async function syncPricebook(apiKey: string, companyId?: number): Promise<{ synced: number }> {
  if (!rawSql || !companyId) return { synced: 0 };
  const items = await fetchPricebookItems(apiKey);

  let synced = 0;

  for (const item of items) {
    if (!item.hcpId) continue;

    await rawSql.query(
      'INSERT INTO pricebook_items (company_id, hcp_id, name, description, cost, category, unit, lineset_ft, lineset_cost, last_synced_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW()) ON CONFLICT (company_id, hcp_id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, cost = EXCLUDED.cost, category = EXCLUDED.category, unit = EXCLUDED.unit, lineset_ft = EXCLUDED.lineset_ft, lineset_cost = EXCLUDED.lineset_cost, last_synced_at = NOW()',
      [companyId, item.hcpId, item.name, item.description, item.cost, item.category, item.unit, item.linesetFt, item.linesetCost]
    );
    synced++;
  }

  return { synced };
}

export async function getAllPricebookItems(companyId?: number): Promise<PricebookItem[]> {
  if (!rawSql) return [];
  let query = 'SELECT * FROM pricebook_items ORDER BY name';
  let params: any[] = [];
  if (companyId) {
    query = 'SELECT * FROM pricebook_items WHERE company_id = $1 ORDER BY name';
    params = [companyId];
  }
  const rows = await rawSql.query(query, params);
  return rows.map(mapPricebookItem);
}
