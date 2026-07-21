import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import * as estimateService from '@/lib/services/estimate';
import { createHcpEstimate } from '@/lib/services/hcp';

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
    const result = await estimateService.pushToHcp(estimateId, user.userId, { createHcpEstimate });
    return NextResponse.json({ success: true, hcpResult: result });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
