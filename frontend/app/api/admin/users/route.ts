import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, requireRole } from '@/lib/auth';
import { rawSql } from '@/lib/db';

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!requireRole(user, ['admin'])) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  if (!rawSql) return NextResponse.json([]);
  const rows = await rawSql`
    SELECT u.id, u.email, u.name, u.role, u.company_id, c.name as company_name 
    FROM users u 
    LEFT JOIN companies c ON u.company_id = c.id 
    ORDER BY u.email
  `;
  return NextResponse.json(rows);
}

export async function PATCH(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!requireRole(user, ['admin'])) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const { userId, companyId } = await request.json();
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

  if (!rawSql) return NextResponse.json({ error: 'No database' }, { status: 500 });

  await rawSql`
    UPDATE users SET company_id = ${companyId || null}, updated_at = NOW() 
    WHERE id = ${userId}
  `;
  return NextResponse.json({ success: true });
}
