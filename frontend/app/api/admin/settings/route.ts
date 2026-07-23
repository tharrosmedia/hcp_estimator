import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { rawSql } from '@/lib/db';

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // allow any logged-in to read and write settings for wizard globals (labor_rate, fees etc)

  if (!rawSql) return NextResponse.json([]);
  const companyId = user.companyId;
  const all = companyId 
    ? await rawSql`SELECT * FROM settings WHERE company_id = ${companyId} ORDER BY key`
    : await rawSql`SELECT * FROM settings ORDER BY key`;
  return NextResponse.json(all);
}

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // any authenticated user can manage global settings (used by builder for all roles)
  // (no further role restriction)

  const { key, value } = await request.json();
  if (!key || value === undefined) return NextResponse.json({ error: 'key and value required' }, { status: 400 });

  if (!rawSql) return NextResponse.json({ error: 'No database' }, { status: 500 });

  const companyId = user.companyId;
  if (!companyId) return NextResponse.json({ error: 'No company' }, { status: 400 });
  const existing = await rawSql`SELECT * FROM settings WHERE company_id = ${companyId} AND key = ${key} LIMIT 1`;
  if (existing.length > 0) {
    await rawSql`
      UPDATE settings 
      SET value = ${value}, updated_at = NOW() 
      WHERE company_id = ${companyId} AND key = ${key}
    `;
  } else {
    await rawSql`
      INSERT INTO settings (company_id, key, value) 
      VALUES (${companyId}, ${key}, ${value})
    `;
  }
  return NextResponse.json({ success: true });
}
