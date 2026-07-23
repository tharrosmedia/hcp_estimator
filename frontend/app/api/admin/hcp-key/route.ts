import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { rawSql } from '@/lib/db';
import { encryptApiKey } from '@/lib/encrypt';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!rawSql) {
    return NextResponse.json({ hasKey: false });
  }

  const rows = await rawSql`SELECT c.hcp_api_key FROM companies c JOIN users u ON u.company_id = c.id WHERE u.id = ${user.userId} LIMIT 1`;
  const hasKey = !!rows[0]?.hcp_api_key;
  return NextResponse.json({ hasKey });
}

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!user.companyId) {
    return NextResponse.json({ error: 'No company associated yet. Create or get assigned to a company first.' }, { status: 400 });
  }

  const { hcpApiKey } = await request.json();
  if (!rawSql) {
    return NextResponse.json({ error: 'No database' }, { status: 500 });
  }
  if (!hcpApiKey) {
    return NextResponse.json({ error: 'hcpApiKey required' }, { status: 400 });
  }

  const encrypted = await encryptApiKey(hcpApiKey);
  await rawSql`
    UPDATE companies c
    SET hcp_api_key = ${encrypted}
    FROM users u
    WHERE u.company_id = c.id AND u.id = ${user.userId}
  `;
  return NextResponse.json({ success: true });
}
