import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, requireRole } from '@/lib/auth';
import { rawSql } from '@/lib/db';
import { encryptApiKey, decryptApiKey } from '@/lib/encrypt';

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!rawSql) return NextResponse.json([]);
  const companyId = user.companyId;
  if (companyId) {
    const rows = await rawSql`SELECT id, name, created_at, updated_at FROM companies WHERE id = ${companyId}`;
    return NextResponse.json(rows);
  }
  // unassigned (bootstrap): allow seeing none or all? return empty to avoid listing others
  return NextResponse.json([]);
}

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!rawSql) return NextResponse.json({ error: 'No database' }, { status: 500 });

  const userInfoRes = await rawSql`SELECT company_id, role FROM users WHERE id = ${user.userId} LIMIT 1`;
  const hasCompany = !!userInfoRes[0]?.company_id;
  const isAdmin = requireRole(user, ['admin']);

  if (!isAdmin) {
    if (hasCompany) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }
    // unassigned user can create their own company (bootstrap)
  }

  const { name, hcpApiKey } = await request.json();
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });

  let keyToStore = null;
  if (hcpApiKey) {
    keyToStore = await encryptApiKey(hcpApiKey);
  }

  const inserted = await rawSql`
    INSERT INTO companies (name, hcp_api_key) 
    VALUES (${name}, ${keyToStore})
    RETURNING id, name, created_at, updated_at
  `;
  const newCompany = inserted[0];

  // assign creator if they had no company, and promote to admin
  if (!hasCompany) {
    await rawSql`
      UPDATE users SET company_id = ${newCompany.id}, role = 'admin', updated_at = NOW()
      WHERE id = ${user.userId}
    `;
  }

  return NextResponse.json(newCompany, { status: 201 });

}
