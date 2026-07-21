import { verifyAccessToken, verifyRefreshToken, signAccessToken } from './services/auth';
import { db, users } from './db';
import { eq } from 'drizzle-orm';
import { UserRole } from './shared/types';
import { NextRequest, NextResponse } from 'next/server';

export interface AuthenticatedUser {
  userId: number;
  email: string;
  role: UserRole;
}

export async function getAuthenticatedUser(request: NextRequest): Promise<AuthenticatedUser | null> {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyAccessToken(token);

    if (!payload) {
      return null;
    }

    return {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
    };
  } catch (error) {
    return null;
  }
}

export function requireRole(user: AuthenticatedUser | null, roles: UserRole[]) {
  if (!user) {
    return false;
  }
  return roles.includes(user.role);
}

export async function handleRefreshToken(body: { refreshToken?: string }) {
  const { refreshToken } = body;
  if (!refreshToken) {
    return { error: 'Refresh token required', status: 401 };
  }

  const payload = verifyRefreshToken(refreshToken);
  if (!payload) {
    return { error: 'Invalid refresh token', status: 401 };
  }

  const [user] = await db.select().from(users).where(eq(users.id, payload.userId)).limit(1);
  if (!user) {
    return { error: 'User not found', status: 401 };
  }

  const accessToken = signAccessToken({
    userId: user.id,
    email: user.email,
    role: (user.role as string).toLowerCase() as UserRole,
  });

  return { accessToken, status: 200 };
}
