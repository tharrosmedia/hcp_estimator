import { db, estimates, estimateMaterials, estimateLabor, users, settings } from '@/lib/db';
import { eq, desc } from 'drizzle-orm';
import { calculateEstimate } from './calc';
import { Estimate, EstimateMaterial, EstimateLabor, CalcResult } from '@/lib/shared/types';

const DEFAULT_SETTINGS = {
  markup: '0.40',
  tax_rate: '0.06',
};

export async function getUserEstimates(userId: number) {
  return db.select().from(estimates).where(eq(estimates.userId, userId)).orderBy(desc(estimates.createdAt));
}

export async function getEstimateById(id: number, userId?: number) {
  const estimate = await db.query.estimates.findFirst({
    where: eq(estimates.id, id),
    with: {
      materials: true,
      labor: true,
    },
  });

  if (!estimate) return null;
  if (userId && estimate.userId !== userId) return null;

  return estimate;
}

export async function createEstimate(data: any, userId: number) {
  const { customerName, customerEmail, customerPhone, jobAddress, jobNotes, materials, labor, markup, taxRate, hcpJobId } = data;

  // Get user settings or global
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  const markupVal = user?.markupOverride ?? (await getSetting('markup')) ?? DEFAULT_SETTINGS.markup;
  const effectiveMarkup = markup ?? parseFloat(String(markupVal));
  const taxVal = (await getSetting('tax_rate')) ?? DEFAULT_SETTINGS.tax_rate;
  const effectiveTax = taxRate ?? parseFloat(String(taxVal));

  const [estimate] = await db.insert(estimates).values({
    userId,
    customerName,
    customerEmail,
    customerPhone,
    jobAddress,
    jobNotes,
    markup: effectiveMarkup,
    taxRate: effectiveTax,
    status: 'draft',
    approvalFlag: false,
    hcpJobId: hcpJobId || null,
  }).returning();

  if (materials?.length) {
    for (const m of materials) {
      await db.insert(estimateMaterials).values({
        estimateId: estimate.id,
        pricebookItemId: m.pricebookItemId,
        name: m.name,
        description: m.description,
        cost: m.cost,
        qty: m.qty,
        markup: effectiveMarkup,
        sellingPrice: m.cost * (1 + effectiveMarkup) * m.qty,
      });
    }
  }

  if (labor?.length) {
    for (const l of labor) {
      const cost = l.hours * l.rate;
      await db.insert(estimateLabor).values({
        estimateId: estimate.id,
        task: l.task,
        hours: l.hours,
        rate: l.rate,
        cost,
        notes: l.notes,
      });
    }
  }

  return getEstimateById(estimate.id);
}

export async function updateEstimate(id: number, data: any, userId: number) {
  const existing = await getEstimateById(id, userId);
  if (!existing) throw new Error('Estimate not found');

  await db.update(estimates).set({
    ...data,
    updatedAt: new Date(),
  }).where(eq(estimates.id, id));

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

export async function pushToHcp(estimateId: number, userId: number, hcpService: any) {
  const estimate = await getEstimateById(estimateId, userId);
  if (!estimate) throw new Error('Estimate not found');

  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  const { decryptApiKey } = await import('@/lib/encrypt');
  const apiKey = await decryptApiKey(user?.hcpApiKey);
  if (!apiKey) throw new Error('User has no HCP API key configured');

  // Only send customer-facing line items (materials with marked up price)
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

  const result = await hcpService.createHcpEstimate(payload, apiKey);

  await db.update(estimates).set({
    status: 'pushed_to_hcp',
    hcpEstimateId: result.id,
    updatedAt: new Date(),
  }).where(eq(estimates.id, estimateId));

  return result;
}

async function getSetting(key: string): Promise<string | null> {
  const row = await db.query.settings.findFirst({ where: eq(settings.key, key) });
  return row?.value || null;
}

export async function computeEstimateResult(estimate: any): Promise<CalcResult> {
  const financingFee = parseFloat(await getSetting('financing_fee') || '0.0499');
  const creditCardFee = 0.03; // default, make configurable later

  return calculateEstimate({
    materials: estimate.materials,
    labor: estimate.labor,
    markup: estimate.markup,
    taxRate: estimate.taxRate,
    financingFee,
    creditCardFee,
  });
}
