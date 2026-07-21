import { NextRequest, NextResponse } from 'next/server';
import { createMagicToken } from '@/lib/services/auth';

export async function POST(request: NextRequest) {
  const { email, name } = await request.json();
  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 });

  const token = await createMagicToken(email);

  // In production: send email with link
  // For MVP/dev: return the token or log it
  const origin = process.env.FRONTEND_URL || 'http://localhost:3000';
  const magicLink = `${origin}/login?token=${token}`;

  // For now (internal tool, email-only no password): always return token so it auto-logs in
  // The link is also logged to Railway console
  console.log(`[LOGIN] Magic link for ${email}: ${magicLink}`);

  return NextResponse.json({
    message: 'Logged in (magic link for reference)',
    devToken: token,
    magicLink,
  });
}
