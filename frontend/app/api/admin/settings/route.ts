import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, requireRole } from '@/lib/auth';
import { rawSql } from '@/lib/db';

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // allow any logged-in to read settings for wizard globals (labor_rate, fees)
  // write still restricted to admin

  if (!rawSql) return NextResponse.json([]);
  const all = await rawSql`SELECT * FROM settings ORDER BY key`;
  return NextResponse.json(all);
}

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!requireRole(user, ['admin'])) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const { key, value } = await request.json();
  if (!key || value === undefined) return NextResponse.json({ error: 'key and value required' }, { status: 400 });

  if (!rawSql) return NextResponse.json({ error: 'No database' }, { status: 500 });

  const existing = await rawSql`SELECT * FROM settings WHERE key = ${key} LIMIT 1`;
  if (existing.length > 0) {
    await rawSql`
      UPDATE settings 
      SET value = ${value}, updated_at = NOW() 
      WHERE key = ${key}
    `;
  } else {
    await rawSql`
      INSERT INTO settings (key, value) 
      VALUES (${key}, ${value})
    `;
  }
  return NextResponse.json({ success: true });
}
