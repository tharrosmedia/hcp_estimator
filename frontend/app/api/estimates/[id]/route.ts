import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import * as estimateService from '@/lib/services/estimate';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const estimateId = parseInt(id);
  const estimate = await estimateService.getEstimateById(estimateId, user.userId);
  if (!estimate) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(estimate);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const estimateId = parseInt(id);
  try {
    const body = await request.json();
    const estimate = await estimateService.updateEstimate(estimateId, body, user.userId);
    return NextResponse.json(estimate);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
