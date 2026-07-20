import { Request, Response } from 'express';
import { createMagicToken, verifyMagicToken, findOrCreateUser, signAccessToken, signRefreshToken } from '../services/auth.service';
import { env } from '../config/env';

export const requestMagicLink = async (req: Request, res: Response) => {
  const { email, name } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  const token = await createMagicToken(email);

  // In production: send email with link
  // For MVP/dev: return the token or log it
  const magicLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?token=${token}`;

  if (env.DEV_BYPASS) {
    console.log(`[DEV] Magic link for ${email}: ${magicLink}`);
  }

  // For MVP we return the token so frontend can auto-login in dev
  res.json({
    message: 'Magic link sent (check console in dev)',
    ...(env.DEV_BYPASS ? { devToken: token, magicLink } : {}),
  });
};

export const verifyMagic = async (req: Request, res: Response) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'Token required' });

  const email = await verifyMagicToken(token);
  if (!email) {
    return res.status(400).json({ error: 'Invalid or expired token' });
  }

  const user = await findOrCreateUser(email);

  const accessToken = signAccessToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  });
  const refreshToken = signRefreshToken(user.id);

  res.json({
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
  });
};
