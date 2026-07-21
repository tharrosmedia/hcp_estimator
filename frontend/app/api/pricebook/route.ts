import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, requireRole } from '@/lib/auth';
import * as pricebookService from '@/lib/services/pricebook';
import { syncPricebook } from '@/lib/services/pricebook';
import { db, users } from '@/lib/db';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const items = await pricebookService.getAllPricebookItems();
  return NextResponse.json(items);
}
