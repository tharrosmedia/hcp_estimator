import { NextRequest, NextResponse } from 'next/server';
import { handleRefreshToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const result = await handleRefreshToken(body);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ accessToken: result.accessToken });
}
