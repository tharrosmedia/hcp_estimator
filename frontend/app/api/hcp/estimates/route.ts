import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { rawSql, db, users } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { fetchHcpEstimates } from '@/lib/services/hcp';
import { decryptApiKey } from '@/lib/encrypt';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || undefined;

  try {
    let key: string | null = null;
    if (rawSql) {
      const rows = await rawSql.query('SELECT c.hcp_api_key FROM companies c JOIN users u ON u.company_id = c.id WHERE u.id = $1 LIMIT 1', [user.userId]);
      key = await decryptApiKey(rows[0]?.hcp_api_key);
    } else {
      const [dbUser] = await db.select().from(users).where(eq(users.id, user.userId)).limit(1);
      key = await decryptApiKey(dbUser?.hcpApiKey);
    }

    if (!key) {
      if (process.env.DEV_BYPASS || process.env.NODE_ENV !== 'production') {
        const mock = await (await import('@/lib/services/hcp')).fetchHcpEstimates('', { search });
        return NextResponse.json(mock);
      }
      return NextResponse.json({ error: 'No HCP API key configured for user' }, { status: 400 });
    }

    const estimates = await fetchHcpEstimates(key, { search });
    return NextResponse.json(estimates);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
