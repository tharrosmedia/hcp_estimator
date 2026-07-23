import { rawSql } from './index';

export async function seedDefaultRules() {
  if (!rawSql) return;

  // Ensure a default company exists
  let companyRows = await rawSql`SELECT * FROM companies LIMIT 1`;
  let companyId = companyRows[0]?.id;
  if (!companyId) {
    const comp = await rawSql`INSERT INTO companies (name) VALUES ('Default Company') RETURNING id`;
    companyId = comp[0]?.id;
  }
  if (!companyId) return;

  // Seed per-company rules
  const existingInstall = await rawSql`SELECT * FROM install_rules WHERE company_id = ${companyId} LIMIT 1`;
  if (existingInstall.length === 0) {
    await rawSql`
      INSERT INTO install_rules (company_id, equipment_type, base_hours, crew_multiplier, notes) VALUES
      (${companyId}, 'ductless_single', 4, 1, 'Single zone ductless'),
      (${companyId}, 'ductless_multi', 6, 1, 'Multi zone'),
      (${companyId}, 'lineset', 1.5, 1, 'Lineset run')
    `;
  }

  const existingLineset = await rawSql`SELECT * FROM lineset_rules WHERE company_id = ${companyId} LIMIT 1`;
  if (existingLineset.length === 0) {
    await rawSql`
      INSERT INTO lineset_rules (company_id, material_category, recommended_ft, cost_per_ft) VALUES
      (${companyId}, 'ductless', 25, 6.5),
      (${companyId}, 'accessory', 15, 5)
    `;
  }

  // Seed default settings per company
  const defaultSettings = [
    { key: 'markup', value: '0.40' },
    { key: 'tax_rate', value: '0.06' },
    { key: 'labor_rate', value: '85' },
    { key: 'credit_card_fee', value: '0.03' },
    { key: 'financing_fee', value: '0.0499' },
  ];

  for (const ds of defaultSettings) {
    const existing = await rawSql`SELECT * FROM settings WHERE company_id = ${companyId} AND key = ${ds.key} LIMIT 1`;
    if (existing.length === 0) {
      await rawSql`
        INSERT INTO settings (company_id, key, value) VALUES (${companyId}, ${ds.key}, ${ds.value})
      `;
    }
  }
}
