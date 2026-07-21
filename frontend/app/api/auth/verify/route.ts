import { NextRequest, NextResponse } from 'next/server';
import { verifyMagicToken, findOrCreateUser, signAccessToken, signRefreshToken } from '@/lib/services/auth';

export async function POST(request: NextRequest) {
  const { token } = await request.json();
  if (!token) return NextResponse.json({ error: 'Token required' }, { status: 400 });

  const email = await verifyMagicToken(token);
  if (!email) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 });
  }

  const user = await findOrCreateUser(email);

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
