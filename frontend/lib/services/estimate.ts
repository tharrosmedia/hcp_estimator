import { rawSql } from '@/lib/db';
import { calculateEstimate } from './calc';
import { Estimate, EstimateMaterial, EstimateLabor, CalcResult } from '@/lib/shared/types';

function mapEstimate(row: any): any {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    customerPhone: row.customer_phone,
    jobAddress: row.job_address,
    jobNotes: row.job_notes,
    markup: row.markup,
    taxRate: row.tax_rate,
    status: row.status,
    hcpEstimateId: row.hcp_estimate_id,
    hcpJobId: row.hcp_job_id,
    approvalFlag: row.approval_flag,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapMaterial(row: any): any {
  if (!row) return null;
  return {
    id: row.id,
    estimateId: row.estimate_id,
    pricebookItemId: row.pricebook_item_id,
    name: row.name,
    description: row.description,
    cost: row.cost,
    qty: row.qty,
    markup: row.markup,
    sellingPrice: row.selling_price,
  };
}

function mapLabor(row: any): any {
  if (!row) return null;
  return {
    id: row.id,
    estimateId: row.estimate_id,
    task: row.task,
    hours: row.hours,
    rate: row.rate,
    cost: row.cost,
    notes: row.notes,
  };
}

const DEFAULT_SETTINGS = {
  markup: '0.40',
  tax_rate: '0.06',
};

export async function getUserEstimates(userId: number) {
  if (!rawSql) return [];
  const rows = await rawSql`SELECT * FROM estimates WHERE user_id = ${userId} ORDER BY created_at DESC`;
  return rows.map(mapEstimate);
}

export async function getEstimateById(id: number, userId?: number) {
  if (!rawSql) return null;
  const estRows = await rawSql`SELECT * FROM estimates WHERE id = ${id} LIMIT 1`;
  const est = mapEstimate(estRows[0]);
  if (!est) return null;
  if (userId && est.userId !== userId) return null;
  const matRows = await rawSql`SELECT * FROM estimate_materials WHERE estimate_id = ${id}`;
  const laborRows = await rawSql`SELECT * FROM estimate_labor WHERE estimate_id = ${id}`;
  est.materials = matRows.map(mapMaterial);
  est.labor = laborRows.map(mapLabor);
  return est;
}

export async function createEstimate(data: any, userId: number) {
  const { customerName, customerEmail, customerPhone, jobAddress, jobNotes, materials, labor, markup, taxRate, hcpJobId, hcpEstimateId } = data;
  if (!rawSql) throw new Error('No database connection');

  const userRows = await rawSql`SELECT markup_override FROM users WHERE id = ${userId} LIMIT 1`;
  const markupRow = await rawSql`SELECT value FROM settings WHERE key = 'markup' LIMIT 1`;
  const taxRow = await rawSql`SELECT value FROM settings WHERE key = 'tax_rate' LIMIT 1`;
  const userMarkup = userRows[0]?.markup_override;
  const markupVal = userMarkup != null ? userMarkup : (markupRow[0]?.value ?? DEFAULT_SETTINGS.markup);
  const effectiveMarkup = markup ?? parseFloat(String(markupVal));
  const taxVal = taxRow[0]?.value ?? DEFAULT_SETTINGS.tax_rate;
  const effectiveTax = taxRate ?? parseFloat(String(taxVal));

  const estRows = await rawSql`
    INSERT INTO estimates (user_id, customer_name, customer_email, customer_phone, job_address, job_notes, markup, tax_rate, status, approval_flag, hcp_job_id, hcp_estimate_id)
    VALUES (${userId}, ${customerName}, ${customerEmail || null}, ${customerPhone || null}, ${jobAddress || null}, ${jobNotes || null}, ${effectiveMarkup}, ${effectiveTax}, 'draft', false, ${hcpJobId || null}, ${hcpEstimateId || null})
    RETURNING *
  `;
  const estimate = mapEstimate(estRows[0]);
  if (!estimate) throw new Error('Failed to create estimate');
  const estId = estimate.id;

  if (materials?.length) {
    for (const m of materials) {
      const sell = m.sellingPrice ?? (m.cost * (1 + effectiveMarkup) * m.qty);
      await rawSql`
        INSERT INTO estimate_materials (estimate_id, pricebook_item_id, name, description, cost, qty, markup, selling_price)
        VALUES (${estId}, ${m.pricebookItemId || null}, ${m.name}, ${m.description || null}, ${m.cost}, ${m.qty}, ${effectiveMarkup}, ${sell})
      `;
    }
  }

  if (labor?.length) {
    for (const l of labor) {
      const cost = l.cost ?? (l.hours * l.rate);
      await rawSql`
        INSERT INTO estimate_labor (estimate_id, task, hours, rate, cost, notes)
        VALUES (${estId}, ${l.task}, ${l.hours}, ${l.rate}, ${cost}, ${l.notes || null})
      `;
    }
  }

  return getEstimateById(estId);
}

export async function updateEstimate(id: number, data: any, userId: number) {
  const existing = await getEstimateById(id, userId);
  if (!existing) throw new Error('Estimate not found');
  if (!rawSql) throw new Error('No database connection');

  if (data.customerName !== undefined) await rawSql`UPDATE estimates SET customer_name = ${data.customerName}, updated_at = NOW() WHERE id = ${id}`;
  if (data.customerEmail !== undefined) await rawSql`UPDATE estimates SET customer_email = ${data.customerEmail}, updated_at = NOW() WHERE id = ${id}`;
  if (data.customerPhone !== undefined) await rawSql`UPDATE estimates SET customer_phone = ${data.customerPhone}, updated_at = NOW() WHERE id = ${id}`;
  if (data.jobAddress !== undefined) await rawSql`UPDATE estimates SET job_address = ${data.jobAddress}, updated_at = NOW() WHERE id = ${id}`;
  if (data.jobNotes !== undefined) await rawSql`UPDATE estimates SET job_notes = ${data.jobNotes}, updated_at = NOW() WHERE id = ${id}`;
  if (data.markup !== undefined) await rawSql`UPDATE estimates SET markup = ${data.markup}, updated_at = NOW() WHERE id = ${id}`;
  if (data.taxRate !== undefined) await rawSql`UPDATE estimates SET tax_rate = ${data.taxRate}, updated_at = NOW() WHERE id = ${id}`;
  if (data.status !== undefined) await rawSql`UPDATE estimates SET status = ${data.status}, updated_at = NOW() WHERE id = ${id}`;
  if (data.approvalFlag !== undefined) await rawSql`UPDATE estimates SET approval_flag = ${data.approvalFlag}, updated_at = NOW() WHERE id = ${id}`;
  if (data.hcpJobId !== undefined) await rawSql`UPDATE estimates SET hcp_job_id = ${data.hcpJobId}, updated_at = NOW() WHERE id = ${id}`;
  if (data.hcpEstimateId !== undefined) await rawSql`UPDATE estimates SET hcp_estimate_id = ${data.hcpEstimateId}, updated_at = NOW() WHERE id = ${id}`;

  const effectiveMarkup = data.markup ?? existing.markup ?? 0.4;

  if (data.materials !== undefined) {
    await rawSql`DELETE FROM estimate_materials WHERE estimate_id = ${id}`;
    for (const m of data.materials) {
      const sell = m.sellingPrice ?? (m.cost * (1 + effectiveMarkup) * m.qty);
      await rawSql`
        INSERT INTO estimate_materials (estimate_id, pricebook_item_id, name, description, cost, qty, markup, selling_price)
        VALUES (${id}, ${m.pricebookItemId || null}, ${m.name}, ${m.description || null}, ${m.cost}, ${m.qty}, ${effectiveMarkup}, ${sell})
      `;
    }
  }

  if (data.labor !== undefined) {
    await rawSql`DELETE FROM estimate_labor WHERE estimate_id = ${id}`;
    for (const l of data.labor) {
      const cost = l.cost ?? (l.hours * l.rate);
      await rawSql`
        INSERT INTO estimate_labor (estimate_id, task, hours, rate, cost, notes)
        VALUES (${id}, ${l.task}, ${l.hours}, ${l.rate}, ${cost}, ${l.notes || null})
      `;
    }
  }

  return getEstimateById(id);
}

export async function duplicateEstimate(id: number, userId: number) {
  const original = await getEstimateById(id, userId);
  if (!original) throw new Error('Estimate not found');

  const newEst = await createEstimate({
    customerName: original.customerName + ' (Copy)',
    customerEmail: original.customerEmail,
    customerPhone: original.customerPhone,
    jobAddress: original.jobAddress,
    jobNotes: original.jobNotes,
    materials: original.materials,
    labor: original.labor,
    markup: original.markup,
    taxRate: original.taxRate,
  }, userId);

  return newEst;
}

export async function pushToHcp(estimateId: number, userId: number, hcpService: { createHcpEstimate: any; updateHcpEstimate?: any }) {
  const estimate = await getEstimateById(estimateId, userId);
  if (!estimate) throw new Error('Estimate not found');
  if (!rawSql) throw new Error('No database connection');

  const userRows = await rawSql`SELECT hcp_api_key FROM users WHERE id = ${userId} LIMIT 1`;
  const { decryptApiKey } = await import('@/lib/encrypt');
  const apiKey = await decryptApiKey(userRows[0]?.hcp_api_key);
  if (!apiKey) throw new Error('User has no HCP API key configured');

  const payload = {
    customer: {
      name: estimate.customerName,
      email: estimate.customerEmail || undefined,
      phone: estimate.customerPhone || undefined,
    },
    jobAddress: estimate.jobAddress || undefined,
    notes: estimate.jobNotes || undefined,
    materials: (estimate.materials as any[]).map(m => ({
      name: m.name,
      description: m.description || '',
      unitPrice: m.sellingPrice / m.qty,
      quantity: m.qty,
    })),
    jobId: estimate.hcpJobId || undefined,
  };

  let result;
  if (estimate.hcpEstimateId && hcpService.updateHcpEstimate) {
    result = await hcpService.updateHcpEstimate(estimate.hcpEstimateId, payload, apiKey);
    await rawSql`UPDATE estimates SET status = 'pushed_to_hcp', updated_at = NOW() WHERE id = ${estimateId}`;
  } else {
    result = await hcpService.createHcpEstimate(payload, apiKey);
    await rawSql`UPDATE estimates SET status = 'pushed_to_hcp', hcp_estimate_id = ${result.id}, updated_at = NOW() WHERE id = ${estimateId}`;
  }

  return result;
}

async function getSetting(key: string): Promise<string | null> {
  if (!rawSql) return null;
  const rows = await rawSql`SELECT value FROM settings WHERE key = ${key} LIMIT 1`;
  return rows[0]?.value || null;
}

export async function computeEstimateResult(estimate: any): Promise<CalcResult> {
  const financingFee = parseFloat(await getSetting('financing_fee') || '0.0499');
  const creditCardFee = parseFloat(await getSetting('credit_card_fee') || '0.03');

  return calculateEstimate({
    materials: estimate.materials,
    labor: estimate.labor,
    markup: estimate.markup,
    taxRate: estimate.taxRate,
    financingFee,
    creditCardFee,
  });
}
