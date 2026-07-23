import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { rawSql } from '@/lib/db';
import { env } from '@/lib/env';
import { AuthTokenPayload, UserRole } from '@/lib/shared/types';

const ACCESS_SECRET = env.JWT_SECRET;
const REFRESH_SECRET = env.JWT_REFRESH_SECRET;

export function generateMagicToken(email: string): string {
  const token = crypto.randomBytes(32).toString('hex');
  return token;
}

export async function createMagicToken(email: string): Promise<string> {
  if (!rawSql) throw new Error('No database connection');
  const token = generateMagicToken(email);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 15); // 15 min

  await rawSql`
    INSERT INTO magic_tokens (email, token, expires_at)
    VALUES (${email.toLowerCase()}, ${token}, ${expiresAt})
  `;

  return token;
}

export async function verifyMagicToken(token: string): Promise<string | null> {
  if (!rawSql) return null;
  const records = await rawSql`SELECT * FROM magic_tokens WHERE token = ${token} LIMIT 1`;
  const record = records[0];

  if (!record || record.used || new Date(record.expires_at) < new Date()) {
    return null;
  }

  await rawSql`
    UPDATE magic_tokens SET used = true WHERE id = ${record.id}
  `;

  return record.email;
}

export async function findOrCreateUser(email: string, name?: string): Promise<any> {
  if (!rawSql) throw new Error('No database connection');

  const lower = email.toLowerCase();
  const existing = await rawSql`SELECT * FROM users WHERE email = ${lower} LIMIT 1`;
  let user = existing[0];

  if (!user) {
    // Derive company from email domain for first user of domain
    const domain = lower.split('@')[1] || 'default';
    const companyName = domain.split('.')[0] || domain; // e.g. 'tharrosmedia' from tharrosmedia.com

    // Find or create company
    let companyRows = await rawSql`SELECT * FROM companies WHERE name ILIKE ${companyName} LIMIT 1`;
    let company = companyRows[0];
    if (!company) {
      const compInserted = await rawSql`
        INSERT INTO companies (name) VALUES (${companyName}) RETURNING *
      `;
      company = compInserted[0];
    }

    const inserted = await rawSql`
      INSERT INTO users (email, name, role, company_id) 
      VALUES (${lower}, ${name || email.split('@')[0]}, 'sales', ${company.id})
      RETURNING *
    `;
    user = inserted[0];
  }
  if (user) {
    user.role = ((user.role as any) || 'sales').toString().toLowerCase() as any;
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
