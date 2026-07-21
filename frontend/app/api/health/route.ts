import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    await db.execute({ sql: 'select 1', params: [] } as any);
    return NextResponse.json({ status: 'ok', time: new Date().toISOString() });
  } catch (e) {
    return NextResponse.json({ status: 'error' }, { status: 500 });
  }
}
