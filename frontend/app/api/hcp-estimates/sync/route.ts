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
    const rows = await rawSql.query('SELECT hcp_api_key FROM users WHERE id = $1 LIMIT 1', [user.userId]);
    const key = await decryptApiKey(rows[0]?.hcp_api_key);
    if (!key) {
      return NextResponse.json({ error: 'No HCP API key available' }, { status: 400 });
    }
    const result = await syncHcpEstimates(key);
    return NextResponse.json({ success: true, ...result });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
