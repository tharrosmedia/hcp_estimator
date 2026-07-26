import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { rawSql } from '@/lib/db';
import { fetchHcpJobs } from '@/lib/services/hcp';
import { decryptApiKey } from '@/lib/encrypt';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date') || undefined;
  const search = searchParams.get('search') || undefined;

  try {
    // Get key from user's company (consistent with other routes)
    let key: string | null = null;
    if (rawSql) {
      const rows = await rawSql`SELECT c.hcp_api_key FROM companies c JOIN users u ON u.company_id = c.id WHERE u.id = ${user.userId} LIMIT 1`;
      key = await decryptApiKey(rows[0]?.hcp_api_key);
    } 

    if (!key) {
      // allow dev bypass
      if (process.env.DEV_BYPASS || process.env.NODE_ENV !== 'production') {
        const mock = await (await import('@/lib/services/hcp')).fetchHcpJobs('', { date, search });
        return NextResponse.json(mock);
      }
      return NextResponse.json({ error: 'No HCP API key configured for user' }, { status: 400 });
    }

    const jobs = await fetchHcpJobs(key, { date, search });
    return NextResponse.json(jobs);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
