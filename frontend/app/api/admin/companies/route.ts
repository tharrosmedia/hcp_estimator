import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, requireRole } from '@/lib/auth';
import { rawSql } from '@/lib/db';
import { encryptApiKey, decryptApiKey } from '@/lib/encrypt';

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!requireRole(user, ['admin'])) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  if (!rawSql) return NextResponse.json([]);
  const rows = await rawSql`SELECT id, name, created_at, updated_at FROM companies ORDER BY name`;
  // do not return keys
  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!requireRole(user, ['admin'])) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const { name, hcpApiKey } = await request.json();
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });

  if (!rawSql) return NextResponse.json({ error: 'No database' }, { status: 500 });

  let keyToStore = null;
  if (hcpApiKey) {
    keyToStore = await encryptApiKey(hcpApiKey);
  }

  const inserted = await rawSql`
    INSERT INTO companies (name, hcp_api_key) 
    VALUES (${name}, ${keyToStore})
    RETURNING id, name, created_at, updated_at
  `;
  return NextResponse.json(inserted[0], { status: 201 });
}
