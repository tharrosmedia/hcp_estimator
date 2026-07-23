import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { rawSql } from '@/lib/db';

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!rawSql) return NextResponse.json([]);
  const companyId = user.companyId;
  const rows = companyId 
    ? await rawSql`SELECT * FROM install_rules WHERE company_id = ${companyId}`
    : await rawSql`SELECT * FROM install_rules`;
  return NextResponse.json(rows);
}
