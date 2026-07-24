import { rawSql } from '@/lib/db';
import { calculateEstimate } from './calc';
import { Estimate, EstimateMaterial, EstimateLabor, CalcResult } from '@/lib/shared/types';

function mapEstimate(row: any): any {
  if (!row) return null;
  return {
    id: row.id,
    companyId: row.company_id,
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
    selectedPayment: row.selected_payment || 'cash',
    hcpOptionName: row.hcp_option_name,
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

export async function getCompanyEstimates(userId: number) {
  if (!rawSql) return [];
  // lookup company
  const userRows = await rawSql`SELECT company_id FROM users WHERE id = ${userId} LIMIT 1`;
  const companyId = userRows[0]?.company_id;
  if (!companyId) return [];
  const rows = await rawSql`SELECT * FROM estimates WHERE company_id = ${companyId} ORDER BY created_at DESC`;
  return rows.map(mapEstimate);
}

export async function getEstimateById(id: number, userId?: number) {
  if (!rawSql) return null;
  const estRows = await rawSql`SELECT * FROM estimates WHERE id = ${id} LIMIT 1`;
  const est = mapEstimate(estRows[0]);
  if (!est) return null;
  if (userId) {
    const userRows = await rawSql`SELECT company_id FROM users WHERE id = ${userId} LIMIT 1`;
    const companyId = userRows[0]?.company_id;
    if (companyId && est.companyId !== companyId) return null;
  }
  const matRows = await rawSql`SELECT * FROM estimate_materials WHERE estimate_id = ${id}`;
  const laborRows = await rawSql`SELECT * FROM estimate_labor WHERE estimate_id = ${id}`;
  est.materials = matRows.map(mapMaterial);
  est.labor = laborRows.map(mapLabor);
  return est;
}

export async function createEstimate(data: any, userId: number) {
  const { customerName, customerEmail, customerPhone, jobAddress, jobNotes, materials, labor, markup, taxRate, hcpJobId, hcpEstimateId, selectedPayment = 'cash', hcpOptionName } = data;
  if (!rawSql) throw new Error('No database connection');

  const userRows = await rawSql`SELECT markup_override, company_id FROM users WHERE id = ${userId} LIMIT 1`;
  const companyId = userRows[0]?.company_id;
  const markupRow = await rawSql`SELECT value FROM settings WHERE company_id = ${companyId} AND key = 'markup' LIMIT 1`;
  const taxRow = await rawSql`SELECT value FROM settings WHERE company_id = ${companyId} AND key = 'tax_rate' LIMIT 1`;
  const userMarkup = userRows[0]?.markup_override;
  const markupVal = userMarkup != null ? userMarkup : (markupRow[0]?.value ?? DEFAULT_SETTINGS.markup);
  const effectiveMarkup = markup ?? parseFloat(String(markupVal));
  const taxVal = taxRow[0]?.value ?? DEFAULT_SETTINGS.tax_rate;
  const effectiveTax = taxRate ?? parseFloat(String(taxVal));

  const estRows = await rawSql`
    INSERT INTO estimates (company_id, user_id, customer_name, customer_email, customer_phone, job_address, job_notes, markup, tax_rate, status, approval_flag, hcp_job_id, hcp_estimate_id, selected_payment, hcp_option_name)
    VALUES (${companyId}, ${userId}, ${customerName}, ${customerEmail || null}, ${customerPhone || null}, ${jobAddress || null}, ${jobNotes || null}, ${effectiveMarkup}, ${effectiveTax}, 'draft', false, ${hcpJobId || null}, ${hcpEstimateId || null}, ${selectedPayment}, ${hcpOptionName || null})
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
  if (data.selectedPayment !== undefined) await rawSql`UPDATE estimates SET selected_payment = ${data.selectedPayment}, updated_at = NOW() WHERE id = ${id}`;
  if (data.hcpOptionName !== undefined) await rawSql`UPDATE estimates SET hcp_option_name = ${data.hcpOptionName || null}, updated_at = NOW() WHERE id = ${id}`;

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
    selectedPayment: original.selectedPayment,
    hcpOptionName: original.hcpOptionName,
  }, userId);

  return newEst;
}

function allocateLaborToMaterials(materials: any[], allLabor: any[]): number[] {
  const laborCosts = new Array(materials.length).fill(0);
  const labors = allLabor || [];
  const used = new Array(labors.length).fill(false);

  materials.forEach((m, i) => {
    const short = (m.name || '').split(/[-_\s]/)[0].toLowerCase();
    labors.forEach((l, j) => {
      if (used[j]) return;
      const task = (l.task || '').toLowerCase().replace(/^install\s+/, '');
      const taskShort = task.split(/[-_\s]/)[0];
      if (short === taskShort || short.includes(taskShort) || taskShort.includes(short)) {
        laborCosts[i] += (l.cost || (l.hours || 0) * (l.rate || 0));
        used[j] = true;
      }
    });
  });

  // distribute any unmatched labor proportionally by qty
  let remaining = 0;
  labors.forEach((l, j) => {
    if (!used[j]) remaining += (l.cost || (l.hours || 0) * (l.rate || 0));
  });
  if (remaining > 0 && materials.length > 0) {
    const totalQty = materials.reduce((sum, m) => sum + (m.qty || 1), 0) || 1;
    materials.forEach((m, i) => {
      const share = ((m.qty || 1) / totalQty) * remaining;
      laborCosts[i] += share;
    });
  }

  return laborCosts;
}

export async function pushToHcp(estimateId: number, userId: number, hcpService: { createHcpEstimate: any; updateHcpEstimate?: any; createHcpEstimateOption?: any; createHcpOptionNote?: any }) {
  const estimate = await getEstimateById(estimateId, userId);
  if (!estimate) throw new Error('Estimate not found');
  if (!rawSql) throw new Error('No database connection');

  const userRows = await rawSql.query('SELECT company_id FROM users WHERE id = $1 LIMIT 1', [userId]);
  const companyId = userRows[0]?.company_id;
  const companyRows = companyId ? await rawSql.query('SELECT hcp_api_key FROM companies WHERE id = $1 LIMIT 1', [companyId]) : [];
  const { decryptApiKey } = await import('@/lib/encrypt');
  const apiKey = await decryptApiKey(companyRows[0]?.hcp_api_key);
  if (!apiKey) throw new Error('Company has no HCP API key configured');

  const ccFee = parseFloat(await getSetting('credit_card_fee', companyId) || '0.03');
  const finFee = parseFloat(await getSetting('financing_fee', companyId) || '0.0499');
  const selected = (estimate.selectedPayment || 'cash') as 'cash' | 'credit_card' | 'financing';
  const feeRate = selected === 'credit_card' ? ccFee : selected === 'financing' ? finFee : 0;

  const noteContent = estimate.jobNotes || 'Generated from HCP Estimator';

  if (estimate.hcpEstimateId && hcpService.createHcpEstimateOption) {
    const taxRate = estimate.taxRate || 0;
    const laborCosts = allocateLaborToMaterials(estimate.materials as any[], estimate.labor as any[]);
    const materialLines = (estimate.materials as any[]).map((m, i) => {
      const perUnit = m.sellingPrice ? (m.sellingPrice / m.qty) : (m.cost * (1 + (estimate.markup || 0)));
      const laborPerUnit = laborCosts[i] / (m.qty || 1);
      // tax only on material; labor added untaxed, then fee on combined
      const matWithTax = perUnit * (1 + taxRate);
      const unitWithTaxAndFee = (matWithTax + laborPerUnit) * (1 + feeRate);
      return {
        name: m.name,
        description: m.description || '',
        unit_price: Math.round(unitWithTaxAndFee * 100),
        unit_cost: Math.round((m.cost || 0) * 100),
        quantity: m.qty,
        taxable: false,
      };
    });
    const lineItems = materialLines;
    const optionName = estimate.hcpOptionName || (selected === 'financing' ? 'Financing Option' : selected === 'credit_card' ? 'Credit Card Option' : 'Cash Option');
    const optionPayload: any = {
      name: optionName,
      line_items: lineItems,
      // tax (on materials only) and labor baked into unit prices; taxable:false so HCP does not add extra tax
    };
    const result = await hcpService.createHcpEstimateOption(estimate.hcpEstimateId, optionPayload, apiKey);
    await rawSql`UPDATE estimates SET status = 'pushed_to_hcp', updated_at = NOW() WHERE id = ${estimateId}`;
    if (result?.id && noteContent && hcpService.createHcpOptionNote) {
      try {
        await hcpService.createHcpOptionNote(estimate.hcpEstimateId, result.id, { content: noteContent }, apiKey);
      } catch (noteErr) {
        console.warn('Failed to add option note', noteErr);
      }
    }
    return result;
  }

  const laborCosts = allocateLaborToMaterials(estimate.materials as any[], estimate.labor as any[]);
  const sentItems = (estimate.materials as any[]).map((m, i) => {
    const baseUnit = m.sellingPrice ? (m.sellingPrice / m.qty) : (m.cost * (1 + (estimate.markup || 0)));
    const laborPerUnit = laborCosts[i] / (m.qty || 1);
    // tax only on material; labor added untaxed, then fee on combined
    const matWithTax = baseUnit * (1 + (estimate.taxRate || 0));
    const unitWithTaxAndFee = (matWithTax + laborPerUnit) * (1 + feeRate);
    return {
      name: m.name,
      description: m.description || '',
      unitPrice: unitWithTaxAndFee,
      quantity: m.qty,
      taxable: false,
    };
  });
  const payload = {
    customer: {
      name: estimate.customerName,
      email: estimate.customerEmail || undefined,
      phone: estimate.customerPhone || undefined,
    },
    jobAddress: estimate.jobAddress || undefined,
    notes: estimate.jobNotes || undefined,
    materials: sentItems,
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

async function getSetting(key: string, companyId?: number): Promise<string | null> {
  if (!rawSql) return null;
  let rows;
  if (companyId) {
    rows = await rawSql`SELECT value FROM settings WHERE company_id = ${companyId} AND key = ${key} LIMIT 1`;
  } else {
    rows = await rawSql`SELECT value FROM settings WHERE key = ${key} LIMIT 1`;
  }
  return rows[0]?.value || null;
}

export async function computeEstimateResult(estimate: any): Promise<CalcResult> {
  const companyId = estimate.companyId;
  const financingFee = parseFloat(await getSetting('financing_fee', companyId) || '0.0499');
  const creditCardFee = parseFloat(await getSetting('credit_card_fee', companyId) || '0.03');

  return calculateEstimate({
    materials: estimate.materials,
    labor: estimate.labor,
    markup: estimate.markup,
    taxRate: estimate.taxRate,
    financingFee,
    creditCardFee,
  });
}
