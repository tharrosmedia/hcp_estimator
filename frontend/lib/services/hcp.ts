import axios from 'axios';
import { env } from '@/lib/env';
import { PricebookItem, CreateEstimatePayload } from '@/lib/shared/types';

const HCP_BASE = env.HCP_BASE_URL || 'https://api.housecallpro.com';

function getHeaders(apiKey: string) {
  return {
    Authorization: `Token token="${apiKey}"`,
  };
}

export async function fetchPricebookItems(apiKey: string): Promise<PricebookItem[]> {
  if (!apiKey) {
    throw new Error('HCP API key required');
  }
  if (apiKey.startsWith('enc:')) {
    throw new Error('HCP API key is still encrypted. Please re-save it in the admin panel.');
  }

  try {
    // Real call
    const res = await axios.get(`${HCP_BASE}/v1/pricebook/items`, {
      headers: getHeaders(apiKey) as any,
      params: { per_page: 100 },
    });

    const items = res.data?.items || res.data || [];
    return items.map((item: any) => ({
      id: 0, // will be assigned on upsert
      hcpId: item.id || item.uuid,
      name: item.name || item.title,
      description: item.description || null,
      cost: parseFloat(item.unit_cost || item.cost || 0),
      category: item.category || item.type || null,
      unit: item.unit || null,
      linesetFt: null,
      linesetCost: null,
      lastSyncedAt: new Date().toISOString(),
    }));
  } catch (err: any) {
    // Fallback to mocks in dev if no key or error
    if (env.DEV_BYPASS || process.env.NODE_ENV !== 'production') {
      console.warn('HCP fetch failed, returning mock pricebook');
      return getMockPricebook();
    }
    const status = err.response?.status;
    if (status === 404) {
      console.warn('HCP pricebook fetch returned 404 - treating as empty list (invalid key or no pricebook access)');
      return [];
    }
    throw new Error(`HCP pricebook fetch failed: ${err.message}`);
  }
}

export async function createHcpEstimate(payload: CreateEstimatePayload, apiKey: string): Promise<{ id: string; status: string }> {
  if (!apiKey) throw new Error('HCP API key required to push estimate');
  if (apiKey.startsWith('enc:')) {
    throw new Error('HCP API key is still encrypted. Please re-save it in the admin panel.');
  }

  try {
    const res = await axios.post(`${HCP_BASE}/v1/estimates`, {
      customer: payload.customer,
      line_items: payload.materials.map(m => ({
        name: m.name,
        description: m.description || '',
        unit_price: m.unitPrice,
        quantity: m.quantity,
      })),
      ...(payload.jobId ? { job_id: payload.jobId } : {}),
      // Do NOT include labor
    }, {
      headers: getHeaders(apiKey) as any,
    });

    return {
      id: res.data?.id || res.data?.estimate?.id || 'mock-' + Date.now(),
      status: res.data?.status || 'created',
    };
  } catch (err: any) {
    if (env.DEV_BYPASS) {
      console.warn('HCP create mock success');
      return { id: 'mock-est-' + Date.now(), status: 'created' };
    }
    throw new Error(`Failed to create HCP estimate: ${err.message}`);
  }
}

export interface HcpJob {
  id: string;
  scheduled_date?: string;
  customer?: { name?: string; email?: string; phone?: string };
  address?: string;
  notes?: string;
}

export async function fetchHcpJobs(apiKey: string, opts: { date?: string; search?: string } = {}): Promise<HcpJob[]> {
  if (!apiKey) {
    throw new Error('HCP API key required');
  }
  if (apiKey.startsWith('enc:')) {
    throw new Error('HCP API key is still encrypted. Please re-save it in the admin panel.');
  }

  try {
    const params: any = { per_page: 50 };
    if (opts.date) {
      // HCP supports scheduled_start or date filters; using simple for broad compat
      params.scheduled_date = opts.date;
    }
    const res = await axios.get(`${HCP_BASE}/v1/jobs`, {
      headers: getHeaders(apiKey) as any,
      params,
    });

    let jobs = res.data?.jobs || res.data || [];
    if (opts.search) {
      const q = opts.search.toLowerCase();
      jobs = jobs.filter((j: any) => (j.customer?.name || '').toLowerCase().includes(q));
    }
    return jobs.map((j: any) => ({
      id: j.id || j.uuid,
      scheduled_date: j.scheduled_date || j.scheduled_start || j.date,
      customer: j.customer,
      address: j.address || j.service_location?.address || undefined,
      notes: j.notes || undefined,
    }));
  } catch (err: any) {
    if (env.DEV_BYPASS || process.env.NODE_ENV !== 'production') {
      console.warn('HCP jobs fetch failed, returning mock jobs');
      return getMockJobs(opts);
    }
    throw new Error(`HCP jobs fetch failed: ${err.message}`);
  }
}

function getMockJobs(opts: { date?: string; search?: string } = {}): HcpJob[] {
  const today = new Date().toISOString().slice(0, 10);
  const mocks: HcpJob[] = [
    { id: 'job-m1', scheduled_date: today, customer: { name: 'John Smith', email: 'john@example.com', phone: '555-0101' }, address: '123 Main St', notes: 'Install new unit' },
    { id: 'job-m2', scheduled_date: today, customer: { name: 'Jane Doe', email: 'jane@example.com' }, address: '456 Oak Ave' },
    { id: 'job-m3', scheduled_date: '2026-07-20', customer: { name: 'Acme Corp' } },
  ];
  let res = mocks;
  if (opts.date) res = res.filter(j => j.scheduled_date === opts.date);
  if (opts.search) {
    const q = opts.search.toLowerCase();
    res = res.filter(j => (j.customer?.name || '').toLowerCase().includes(q));
  }
  return res;
}

function getMockPricebook(): PricebookItem[] {
  return [
    { id: 1, hcpId: 'mock-1', name: 'Mitsubishi MXZ-3C24NA2', description: '3-ton multi zone outdoor', cost: 2450, category: 'ductless', unit: 'each', linesetFt: null, linesetCost: null, lastSyncedAt: new Date().toISOString() },
    { id: 2, hcpId: 'mock-2', name: 'Mitsubishi MSZ-GL12NA', description: 'Wall mounted indoor 12k', cost: 890, category: 'ductless', unit: 'each', linesetFt: null, linesetCost: null, lastSyncedAt: new Date().toISOString() },
    { id: 3, hcpId: 'mock-3', name: 'Lineset 1/4x1/2 25ft', description: 'Precharged lineset', cost: 145, category: 'accessory', unit: 'each', linesetFt: 25, linesetCost: 145, lastSyncedAt: new Date().toISOString() },
    { id: 4, hcpId: 'mock-4', name: 'Mini split disconnect 30A', description: 'Fused disconnect', cost: 42, category: 'electrical', unit: 'each', linesetFt: null, linesetCost: null, lastSyncedAt: new Date().toISOString() },
    { id: 5, hcpId: 'mock-5', name: 'Condensate pump', description: 'Little Giant VCMA-20ULS', cost: 78, category: 'accessory', unit: 'each', linesetFt: null, linesetCost: null, lastSyncedAt: new Date().toISOString() },
  ];
}
