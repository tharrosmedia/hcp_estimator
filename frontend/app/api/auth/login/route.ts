import { NextRequest, NextResponse } from 'next/server';
import { createMagicToken, findOrCreateUser, signAccessToken, signRefreshToken } from '@/lib/services/auth';
import { env } from '@/lib/env';

export async function POST(request: NextRequest) {
  const { email, name } = await request.json();
  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 });

  const token = await createMagicToken(email);

  // In production: send email with link
  // For MVP/dev: return the token or log it
  const origin = process.env.FRONTEND_URL || 'http://localhost:3000';
  const magicLink = `${origin}/login?token=${token}`;

  if (env.DEV_BYPASS) {
    console.log(`[DEV] Magic link for ${email}: ${magicLink}`);
  }

  // For MVP we return the token so frontend can auto-login in dev
  return NextResponse.json({
    message: 'Magic link sent (check console in dev)',
    ...(env.DEV_BYPASS ? { devToken: token, magicLink } : {}),
  });
}
