import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

export async function GET() {
  try {
    await db.execute(sql`select 1`);
    return NextResponse.json({ status: 'ok', time: new Date().toISOString() });
  } catch (e) {
    return NextResponse.json({ status: 'error' }, { status: 500 });
  }
}
