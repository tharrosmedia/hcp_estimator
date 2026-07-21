import { rawSql } from './index';

export async function seedDefaultRules() {
  if (!rawSql) return;

  // Seed some sensible defaults (no hard coded markup etc)
  const existingInstall = await rawSql`SELECT * FROM install_rules LIMIT 1`;
  if (existingInstall.length === 0) {
    await rawSql`
      INSERT INTO install_rules (equipment_type, base_hours, crew_multiplier, notes) VALUES
      ('ductless_single', 4, 1, 'Single zone ductless'),
      ('ductless_multi', 6, 1, 'Multi zone'),
      ('lineset', 1.5, 1, 'Lineset run')
    `;
  }

  const existingLineset = await rawSql`SELECT * FROM lineset_rules LIMIT 1`;
  if (existingLineset.length === 0) {
    await rawSql`
      INSERT INTO lineset_rules (material_category, recommended_ft, cost_per_ft) VALUES
      ('ductless', 25, 6.5),
      ('accessory', 15, 5)
    `;
  }

  // Seed default global settings that the estimate builder and calcs use
  const defaultSettings = [
    { key: 'markup', value: '0.40' },
    { key: 'tax_rate', value: '0.06' },
    { key: 'labor_rate', value: '85' },
    { key: 'credit_card_fee', value: '0.03' },
    { key: 'financing_fee', value: '0.0499' },
  ];

  for (const ds of defaultSettings) {
    const existing = await rawSql`SELECT * FROM settings WHERE key = ${ds.key} LIMIT 1`;
    if (existing.length === 0) {
      await rawSql`
        INSERT INTO settings (key, value) VALUES (${ds.key}, ${ds.value})
      `;
    }
  }
}
