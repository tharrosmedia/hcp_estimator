import { NextRequest, NextResponse } from 'next/server';
import { findOrCreateUser, signAccessToken, signRefreshToken } from '@/lib/services/auth';

export async function POST(request: NextRequest) {
  const { email, name } = await request.json();
  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 });

  const user = await findOrCreateUser(email, name);

  const accessToken = signAccessToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  });
  const refreshToken = signRefreshToken(user.id);

  return NextResponse.json({
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
  });
}
