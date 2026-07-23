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
  const companyId = user.companyId;
  if (!companyId) return NextResponse.json([]);

  const rows = await rawSql`
    SELECT u.id, u.email, u.name, u.role, u.company_id, c.name as company_name 
    FROM users u 
    LEFT JOIN companies c ON u.company_id = c.id 
    WHERE u.company_id = ${companyId}
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

  const callerCompany = user.companyId;
  if (!callerCompany) return NextResponse.json({ error: 'No company' }, { status: 403 });

  // Only allow operating on users in the same company (prevent cross-company leaks)
  const target = await rawSql`SELECT company_id FROM users WHERE id = ${userId} LIMIT 1`;
  if (target[0] && target[0].company_id && target[0].company_id !== callerCompany) {
    return NextResponse.json({ error: 'Cannot modify users from other companies' }, { status: 403 });
  }

  await rawSql`
    UPDATE users SET company_id = ${companyId || null}, updated_at = NOW() 
    WHERE id = ${userId}
  `;
  return NextResponse.json({ success: true });
}

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!requireRole(user, ['admin']) || !user.companyId) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const { email, role = 'sales' } = await request.json();
  if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 });

  if (!rawSql) return NextResponse.json({ error: 'No database' }, { status: 500 });

  const lower = email.toLowerCase().trim();
  const name = lower.split('@')[0];

  try {
    await rawSql`
      INSERT INTO users (email, name, role, company_id, created_at, updated_at)
      VALUES (${lower}, ${name}, ${role}, ${user.companyId}, NOW(), NOW())
    `;
    return NextResponse.json({ success: true });
  } catch (e: any) {
    if (String(e).includes('unique') || e.code === '23505') {
      return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to add user' }, { status: 500 });
  }
}
