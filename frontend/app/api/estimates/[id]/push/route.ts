import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import * as estimateService from '@/lib/services/estimate';
import { createHcpEstimate, updateHcpEstimate, createHcpEstimateOption, createHcpOptionNote } from '@/lib/services/hcp';

export const runtime = 'nodejs';

export async function POST(
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
    const result = await estimateService.pushToHcp(estimateId, user.userId, { createHcpEstimate, updateHcpEstimate, createHcpEstimateOption, createHcpOptionNote });
    return NextResponse.json({ success: true, hcpResult: result });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
