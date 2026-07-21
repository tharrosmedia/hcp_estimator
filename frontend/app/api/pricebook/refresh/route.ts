import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { syncPricebook } from '@/lib/services/pricebook';
import { rawSql } from '@/lib/db';
import { decryptApiKey } from '@/lib/encrypt';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // allow any logged-in user to trigger pricebook refresh (uses their HCP key or sync key)
  if (!rawSql) {
    return NextResponse.json({ error: 'No database' }, { status: 500 });
  }
  try {
    const rows = await rawSql`SELECT hcp_api_key FROM users WHERE id = ${user.userId} LIMIT 1`;
    const key = await decryptApiKey(rows[0]?.hcp_api_key) || process.env.HCP_SYNC_KEY;
    if (!key) {
      return NextResponse.json({ error: 'No HCP API key available for sync' }, { status: 400 });
    }
    const result = await syncPricebook(key);
    return NextResponse.json({ success: true, ...result });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
