import axios from 'axios';
import { env } from '@/lib/env';
import { rawSql } from '@/lib/db';
import { PricebookItem, CreateEstimatePayload } from '@/lib/shared/types';

const HCP_BASE = env.HCP_BASE_URL || 'https://api.housecallpro.com';

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getHeaders(apiKey: string) {
  return {
    Authorization: `Token token="${apiKey}"`,
    Accept: 'application/json',
  };
}

function getBareHeaders(apiKey: string) {
  return {
    Authorization: apiKey,
    Accept: 'application/json',
  };
}

export async function fetchMaterialCategories(apiKey: string): Promise<any[]> {
  if (!apiKey) {
    throw new Error('HCP API key required');
  }
  if (apiKey.startsWith('enc:')) {
    throw new Error('HCP API key is still encrypted. Please re-save it in the admin panel.');
  }

  try {
    const allCategories: any[] = [];
    let page = 1;
    const pageSize = 100;

    while (true) {
      const res = await axios.get(`${HCP_BASE}/api/price_book/material_categories`, {
        headers: getHeaders(apiKey) as any,
        params: { page, page_size: pageSize },
      });

      const rawItems = res.data?.data || res.data || [];
      const items = Array.isArray(rawItems) ? rawItems : (rawItems ? [rawItems] : []);
      allCategories.push(...items);

      if (items.length < pageSize) break;
      page++;
      await sleep(100);
      if (page > 20) break; // safety cap
    }

    console.log(`[HCP] Fetched ${allCategories.length} material categories`);
    return allCategories;
  } catch (err: any) {
    if (env.DEV_BYPASS || process.env.NODE_ENV !== 'production') {
      console.warn('HCP categories fetch failed, returning empty');
      return [];
    }
    throw new Error(`HCP material categories fetch failed: ${err.message}`);
  }
}

export async function fetchPricebookItems(apiKey: string): Promise<PricebookItem[]> {
  if (!apiKey) {
    throw new Error('HCP API key required');
  }
  if (apiKey.startsWith('enc:')) {
    throw new Error('HCP API key is still encrypted. Please re-save it in the admin panel.');
  }

  try {
    const categories = await fetchMaterialCategories(apiKey);
    if (categories.length === 0) {
      console.warn('[HCP] No material categories returned from HCP; pricebook will be empty');
    }
    const allItems: any[] = [];
    const pageSize = 100;

    for (const cat of categories) {
      if (!cat.uuid) continue;
      let page = 1;
      while (true) {
        const res = await axios.get(`${HCP_BASE}/api/price_book/materials`, {
          headers: getHeaders(apiKey) as any,
          params: { material_category_uuid: cat.uuid, page, page_size: pageSize },
        });

        const rawItems = res.data?.data || res.data || [];
        const items = Array.isArray(rawItems) ? rawItems : (rawItems ? [rawItems] : []);
        allItems.push(...items);

        if (items.length < pageSize) break;
        page++;
        await sleep(100);
        if (page > 20) break; // safety cap
      }
    }

    console.log(`[HCP] Fetched ${allItems.length} pricebook materials`);
    if (allItems.length === 0 && (env.DEV_BYPASS || process.env.NODE_ENV !== 'production')) {
      console.warn('HCP returned 0 items, returning mock pricebook');
      return getMockPricebook();
    }
    return allItems.map((item: any) => ({
      id: 0, // will be assigned on upsert
      hcpId: item.uuid,
      name: item.name,
      description: item.description || null,
      cost: parseFloat(item.cost || 0) / 100,
      category: item.material_category_name || null,
      unit: item.unit_of_measure || null,
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
    throw new Error(`HCP pricebook fetch failed: ${err.message}`);
  }
}

export async function createHcpEstimate(payload: CreateEstimatePayload, apiKey: string): Promise<{ id: string; status: string }> {
  if (!apiKey) throw new Error('HCP API key required to push estimate');
  if (apiKey.startsWith('enc:')) {
    throw new Error('HCP API key is still encrypted. Please re-save it in the admin panel.');
  }

  try {
    const res = await axios.post(`${HCP_BASE}/estimates`, {
      customer: payload.customer,
      line_items: payload.materials.map(m => ({
        name: m.name,
        description: m.description || '',
        unit_price: Math.round((m.unitPrice || 0) * 100),
        unit_cost: 0,
        quantity: m.quantity,
        taxable: true,
      })),
      ...(payload.jobId ? { job_id: payload.jobId } : {}),
      // Do NOT include labor
    }, {
      headers: getBareHeaders(apiKey) as any,
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

export async function updateHcpEstimate(estimateId: string, payload: CreateEstimatePayload, apiKey: string): Promise<{ id: string; status: string }> {
  if (!apiKey) throw new Error('HCP API key required to push estimate');
  if (apiKey.startsWith('enc:')) {
    throw new Error('HCP API key is still encrypted. Please re-save it in the admin panel.');
  }

  try {
    const res = await axios.patch(`${HCP_BASE}/estimates/${estimateId}`, {
      line_items: payload.materials.map(m => ({
        name: m.name,
        description: m.description || '',
        unit_price: Math.round((m.unitPrice || 0) * 100),
        unit_cost: 0,
        quantity: m.quantity,
        taxable: true,
      })),
    }, {
      headers: getBareHeaders(apiKey) as any,
    });

    return {
      id: estimateId,
      status: res.data?.status || 'updated',
    };
  } catch (err: any) {
    if (env.DEV_BYPASS) {
      return { id: estimateId, status: 'updated' };
    }
    throw new Error(`Failed to update HCP estimate: ${err.message}`);
  }
}

export async function createHcpEstimateOption(
  estimateId: string,
  option: { name: string; line_items: any[]; tax?: any },
  apiKey: string
): Promise<{ id: string; status: string }> {
  if (!apiKey) throw new Error('HCP API key required to push option');
  if (apiKey.startsWith('enc:')) {
    throw new Error('HCP API key is still encrypted. Please re-save it in the admin panel.');
  }

  try {
    const res = await axios.post(`${HCP_BASE}/estimates/${estimateId}/options`, {
      name: option.name,
      line_items: option.line_items,
      ...(option.tax ? { tax: option.tax } : {}),
    }, {
      headers: {
        Authorization: apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      } as any,
    });

    return {
      id: res.data?.id || 'mock-opt-' + Date.now(),
      status: res.data?.status || 'created',
    };
  } catch (err: any) {
    if (env.DEV_BYPASS) {
      console.warn('HCP create option mock success');
      return { id: 'mock-opt-' + Date.now(), status: 'created' };
    }
    throw new Error(`Failed to create HCP estimate option: ${err.message}`);
  }
}

export async function createHcpOptionNote(
  estimateId: string,
  optionId: string,
  note: { content: string },
  apiKey: string
): Promise<{ id: string; content: string }> {
  if (!apiKey) throw new Error('HCP API key required');
  if (apiKey.startsWith('enc:')) {
    throw new Error('HCP API key is still encrypted. Please re-save it in the admin panel.');
  }

  try {
    const res = await axios.post(`${HCP_BASE}/estimates/${estimateId}/options/${optionId}/notes`, {
      content: note.content,
    }, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      } as any,
    });
    return res.data || { id: 'mock-note', content: note.content };
  } catch (err: any) {
    if (env.DEV_BYPASS) {
      return { id: 'mock-note', content: note.content };
    }
    throw new Error(`Failed to create HCP option note: ${err.message}`);
  }
}

export interface HcpJob {
  id: string;
  scheduled_date?: string;
  customer?: { name?: string; email?: string; phone?: string };
  address?: string;
  notes?: string;
}

export interface HcpEstimate {
  id: string;
  created_at?: string;
  customer?: { name?: string; email?: string; phone?: string };
  address?: string;
  status?: string;
  notes?: string;
  schedule?: {
    scheduled_start?: string;
    scheduled_end?: string;
    appointments?: any[];
  };
  estimate_number?: string;
  work_status?: string;
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

export async function fetchHcpEstimates(apiKey: string, opts: { search?: string } = {}): Promise<HcpEstimate[]> {
  if (!apiKey) {
    throw new Error('HCP API key required');
  }
  if (apiKey.startsWith('enc:')) {
    throw new Error('HCP API key is still encrypted. Please re-save it in the admin panel.');
  }

  try {
    const allEsts: any[] = [];
    let page = 1;
    const pageSize = 100;

    while (true) {
      const params: any = { page, page_size: pageSize };
      const res = await axios.get(`${HCP_BASE}/estimates`, {
        headers: getBareHeaders(apiKey) as any,
        params,
      });

      const data = res.data || {};
      const pageEsts = data.estimates || [];
      allEsts.push(...pageEsts);

      if (pageEsts.length < pageSize || page >= (data.total_pages || 1)) break;
      page++;
      if (page > 10) break; // safety
    }

    let ests = allEsts;
    if (opts.search) {
      const q = opts.search.toLowerCase();
      ests = ests.filter((e: any) => {
        const cust = e.customer || {};
        const name = `${cust.first_name || ''} ${cust.last_name || ''} ${cust.company_name || ''}`.toLowerCase();
        return name.includes(q);
      });
    }

    return ests.map((e: any) => {
      const cust = e.customer || {};
      const name = [cust.first_name, cust.last_name].filter(Boolean).join(' ') || cust.company_name || cust.company || '';
      const phone = cust.mobile_number || cust.home_number || cust.work_number || '';
      const addrObj = e.address || {};
      const addr = [addrObj.street, addrObj.street_line_2, addrObj.city, addrObj.state, addrObj.zip].filter(Boolean).join(', ');
      const sched = e.schedule || {};
      return {
        id: e.id,
        created_at: e.created_at,
        customer: { name, email: cust.email, phone },
        address: addr,
        status: e.work_status || (e.options && e.options[0] && e.options[0].status),
        notes: e.notes ? (Array.isArray(e.notes) ? e.notes.map((n: any) => n.content).join(' ') : e.notes) : undefined,
        schedule: sched,
        estimate_number: e.estimate_number,
        work_status: e.work_status,
      };
    });
  } catch (err: any) {
    if (env.DEV_BYPASS || process.env.NODE_ENV !== 'production') {
      return getMockEstimates(opts);
    }
    throw new Error(`HCP estimates fetch failed: ${err.message}`);
  }
}

function getMockEstimates(opts: { search?: string } = {}): HcpEstimate[] {
  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86400000).toISOString();
  const mocks: HcpEstimate[] = [
    { id: 'est-m1', created_at: today, customer: { name: 'John Smith', email: 'john@example.com', phone: '555-0101' }, address: '123 Main St', status: 'draft', schedule: { scheduled_start: tomorrow } },
    { id: 'est-m2', created_at: today, customer: { name: 'Jane Doe', email: 'jane@example.com' }, address: '456 Oak Ave', status: 'sent', schedule: { scheduled_start: '2026-08-01T10:00:00' } },
    { id: 'est-m3', created_at: '2026-07-20', customer: { name: 'Acme Corp' }, status: 'draft' },
  ];
  let res = mocks;
  if (opts.search) {
    const q = opts.search.toLowerCase();
    res = res.filter(e => (e.customer?.name || '').toLowerCase().includes(q));
  }
  return res;
}

function getMockPricebook(): PricebookItem[] {
  return [
    { id: 1, hcpId: 'mock-1', name: 'Mitsubishi MXZ-3C24NA2', description: '3-ton multi zone outdoor', cost: 2450, category: 'ductless', unit: 'each', linesetFt: null, linesetCost: null, lastSyncedAt: new Date().toISOString() },
    { id: 2, hcpId: 'mock-2', name: 'Mitsubishi MSZ-GL12NA', description: 'Wall mounted indoor 12k', cost: 890, category: 'ductless', unit: 'each', linesetFt: 25, linesetCost: 145, lastSyncedAt: new Date().toISOString() },
    { id: 3, hcpId: 'mock-3', name: 'Lineset 1/4x1/2 25ft', description: 'Precharged lineset', cost: 145, category: 'accessory', unit: 'each', linesetFt: 25, linesetCost: 145, lastSyncedAt: new Date().toISOString() },
    { id: 4, hcpId: 'mock-4', name: 'Mini split disconnect 30A', description: 'Fused disconnect', cost: 42, category: 'electrical', unit: 'each', linesetFt: null, linesetCost: null, lastSyncedAt: new Date().toISOString() },
    { id: 5, hcpId: 'mock-5', name: 'Condensate pump', description: 'Little Giant VCMA-20ULS', cost: 78, category: 'accessory', unit: 'each', linesetFt: null, linesetCost: null, lastSyncedAt: new Date().toISOString() },
  ];
}

export async function syncHcpEstimates(apiKey: string): Promise<{ synced: number }> {
  if (!rawSql) return { synced: 0 };
  const ests = await fetchHcpEstimates(apiKey);

  let synced = 0;

  for (const est of ests) {
    if (!est.id) continue;

    const sched = est.schedule || {};
    const start = sched.scheduled_start ? new Date(sched.scheduled_start) : null;
    const end = sched.scheduled_end ? new Date(sched.scheduled_end) : null;

    await rawSql.query(
      'INSERT INTO hcp_estimates (hcp_id, estimate_number, work_status, customer_name, customer_email, customer_phone, address, scheduled_start, scheduled_end, status, notes, last_synced_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW()) ON CONFLICT (hcp_id) DO UPDATE SET estimate_number = EXCLUDED.estimate_number, work_status = EXCLUDED.work_status, customer_name = EXCLUDED.customer_name, customer_email = EXCLUDED.customer_email, customer_phone = EXCLUDED.customer_phone, address = EXCLUDED.address, scheduled_start = EXCLUDED.scheduled_start, scheduled_end = EXCLUDED.scheduled_end, status = EXCLUDED.status, notes = EXCLUDED.notes, last_synced_at = NOW()',
      [
        est.id,
        est.estimate_number || null,
        est.work_status || null,
        est.customer?.name || null,
        est.customer?.email || null,
        est.customer?.phone || null,
        est.address || null,
        start,
        end,
        est.status || null,
        est.notes || null,
      ]
    );
    synced++;
  }

  return { synced };
}

export async function getUpcomingHcpEstimates(limit = 3): Promise<HcpEstimate[]> {
  if (!rawSql) return [];
  const now = new Date();
  const rows = await rawSql.query(
    'SELECT * FROM hcp_estimates WHERE scheduled_start > $1 ORDER BY scheduled_start ASC LIMIT $2',
    [now, limit]
  );
  return rows.map(mapHcpEstimate);
}

export async function getAllHcpEstimates(search?: string): Promise<HcpEstimate[]> {
  if (!rawSql) return [];
  let query = 'SELECT * FROM hcp_estimates ORDER BY scheduled_start ASC NULLS LAST, created_at DESC';
  let params: any[] = [];
  if (search) {
    query = 'SELECT * FROM hcp_estimates WHERE customer_name ILIKE $1 OR address ILIKE $1 ORDER BY scheduled_start ASC NULLS LAST, created_at DESC';
    params = [`%${search}%`];
  }
  const rows = await rawSql.query(query, params);
  return rows.map(mapHcpEstimate);
}

function mapHcpEstimate(row: any): HcpEstimate {
  if (!row) return null as any;
  return {
    id: row.hcp_id,
    created_at: row.last_synced_at,
    customer: {
      name: row.customer_name,
      email: row.customer_email,
      phone: row.customer_phone,
    },
    address: row.address,
    status: row.status || row.work_status,
    notes: row.notes,
    schedule: row.scheduled_start ? {
      scheduled_start: row.scheduled_start,
      scheduled_end: row.scheduled_end,
    } : undefined,
    estimate_number: row.estimate_number,
    work_status: row.work_status,
  };
}

