import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { getAllHcpEstimates, getUpcomingHcpEstimates } from '@/lib/services/hcp';

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || undefined;
  const upcoming = searchParams.get('upcoming') === 'true';

  try {
    let items;
    if (upcoming) {
      items = await getUpcomingHcpEstimates(3);
    } else {
      items = await getAllHcpEstimates(search);
    }
    return NextResponse.json(items);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
