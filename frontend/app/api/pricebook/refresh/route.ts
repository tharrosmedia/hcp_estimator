import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, requireRole } from '@/lib/auth';
import { syncPricebook } from '@/lib/services/pricebook';
import { db, users } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { decryptApiKey } from '@/lib/encrypt';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!requireRole(user, ['admin', 'manager'])) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  try {
    const [dbUser] = await db.select().from(users).where(eq(users.id, user.userId)).limit(1);
    const key = await decryptApiKey(dbUser?.hcpApiKey) || process.env.HCP_SYNC_KEY;
    if (!key) {
      return NextResponse.json({ error: 'No HCP API key available for sync' }, { status: 400 });
    }
    const result = await syncPricebook(key);
    return NextResponse.json({ success: true, ...result });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
