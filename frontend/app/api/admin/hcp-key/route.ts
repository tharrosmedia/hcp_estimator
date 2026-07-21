import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { db, users } from '@/lib/db';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const dbUser = await db.query.users.findFirst({ where: eq(users.id, user.userId) });
  return NextResponse.json({ hasKey: !!dbUser?.hcpApiKey });
}

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { hcpApiKey } = await request.json();
  await db.update(users).set({ hcpApiKey }).where(eq(users.id, user.userId));
  return NextResponse.json({ success: true });
}
