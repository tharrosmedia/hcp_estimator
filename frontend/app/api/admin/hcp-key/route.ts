import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { rawSql } from '@/lib/db';

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!rawSql) {
    return NextResponse.json({ hasKey: false });
  }

  const rows = await rawSql`SELECT hcp_api_key FROM users WHERE id = ${user.userId} LIMIT 1`;
  const hasKey = !!rows[0]?.hcp_api_key;
  return NextResponse.json({ hasKey });
}

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { hcpApiKey } = await request.json();
  if (!rawSql) {
    return NextResponse.json({ error: 'No database' }, { status: 500 });
  }

  await rawSql`
    UPDATE users 
    SET hcp_api_key = ${hcpApiKey} 
    WHERE id = ${user.userId}
  `;
  return NextResponse.json({ success: true });
}
