import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import * as pricebookService from '@/lib/services/pricebook';

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const companyId = user.companyId;
  const items = await pricebookService.getAllPricebookItems(companyId || undefined);
  return NextResponse.json(items);
}
