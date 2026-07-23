import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, requireRole } from '@/lib/auth';
import { db, installRules, linesetRules } from '@/lib/db';
import { eq, and } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!requireRole(user, ['admin', 'manager'])) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const companyId = user.companyId;
  const rules = companyId 
    ? await db.select().from(installRules).where(eq(installRules.companyId, companyId)) 
    : await db.select().from(installRules);
  return NextResponse.json(rules);
}

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!requireRole(user, ['admin'])) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const companyId = user.companyId;
  if (!companyId) return NextResponse.json({ error: 'No company' }, { status: 400 });
  const { equipmentType, baseHours, crewMultiplier, notes } = await request.json();
  const existing = await db.query.installRules.findFirst({ 
    where: and(eq(installRules.companyId, companyId), eq(installRules.equipmentType, equipmentType)) 
  });
  if (existing) {
    await db.update(installRules).set({ baseHours, crewMultiplier, notes }).where(eq(installRules.id, existing.id));
  } else {
    await db.insert(installRules).values({ companyId, equipmentType, baseHours, crewMultiplier, notes });
  }
  return NextResponse.json({ success: true });
}
