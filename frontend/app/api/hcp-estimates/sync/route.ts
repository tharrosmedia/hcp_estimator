import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { rawSql } from '@/lib/db';
import { syncHcpEstimates } from '@/lib/services/hcp';
import { decryptApiKey } from '@/lib/encrypt';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!rawSql) {
    return NextResponse.json({ error: 'No database' }, { status: 500 });
  }
  try {
    const companyRows = await rawSql.query('SELECT c.hcp_api_key FROM companies c JOIN users u ON u.company_id = c.id WHERE u.id = $1 LIMIT 1', [user.userId]);
    const companyId = user.companyId;
    const key = await decryptApiKey(companyRows[0]?.hcp_api_key);
    if (!key) {
      return NextResponse.json({ error: 'No HCP API key available' }, { status: 400 });
    }
    const result = await syncHcpEstimates(key, companyId || undefined);
    return NextResponse.json({ success: true, ...result });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
