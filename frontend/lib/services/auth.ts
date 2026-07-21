import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { db, users, magicTokens } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { env } from '@/lib/env';
import { AuthTokenPayload, UserRole } from '@/lib/shared/types';

const ACCESS_SECRET = env.JWT_SECRET;
const REFRESH_SECRET = env.JWT_REFRESH_SECRET;

export function generateMagicToken(email: string): string {
  const token = crypto.randomBytes(32).toString('hex');
  return token;
}

export async function createMagicToken(email: string): Promise<string> {
  const token = generateMagicToken(email);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 15); // 15 min

  await db.insert(magicTokens).values({
    email: email.toLowerCase(),
    token,
    expiresAt,
  });

  return token;
}

export async function verifyMagicToken(token: string): Promise<string | null> {
  const record = await db.query.magicTokens.findFirst({
    where: eq(magicTokens.token, token),
  });

  if (!record || record.used || record.expiresAt < new Date()) {
    return null;
  }

  await db.update(magicTokens).set({ used: true }).where(eq(magicTokens.id, record.id));

  return record.email;
}

export async function findOrCreateUser(email: string, name?: string): Promise<any> {
  const lower = email.toLowerCase();
  let [user] = await db.select().from(users).where(eq(users.email, lower)).limit(1);

  if (!user) {
    const [newUser] = await db.insert(users).values({
      email: lower,
      name: name || email.split('@')[0],
      role: 'sales',
    }).returning();
    user = newUser;
  }
  if (user) {
    user.role = (user.role as string).toLowerCase() as any;
  }
  return user;
}

export function signAccessToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: env.JWT_EXPIRES_IN as any });
}

export function signRefreshToken(userId: number): string {
  return jwt.sign({ userId }, REFRESH_SECRET, { expiresIn: env.JWT_REFRESH_EXPIRES_IN as any });
}

export function verifyAccessToken(token: string): AuthTokenPayload | null {
  try {
    return jwt.verify(token, ACCESS_SECRET) as AuthTokenPayload;
  } catch {
    return null;
  }
}

export function verifyRefreshToken(token: string): { userId: number } | null {
  try {
    return jwt.verify(token, REFRESH_SECRET) as { userId: number };
  } catch {
    return null;
  }
}
