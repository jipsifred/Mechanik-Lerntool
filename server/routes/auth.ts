import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import type { Request, Response } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import { verifyToken } from '../middleware/auth.js';

const router = Router();

function getDb(): import('better-sqlite3').Database {
  // Imported lazily to avoid circular dependency; set by server/index.ts
  return (globalThis as any).__usersDb;
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

function createTokens(userId: number) {
  const accessSecret = process.env.JWT_ACCESS_SECRET!;
  const refreshSecret = process.env.JWT_REFRESH_SECRET!;

  const accessToken = jwt.sign({ userId }, accessSecret, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ userId }, refreshSecret, { expiresIn: '7d' });
  return { accessToken, refreshToken };
}

function saveRefreshToken(userId: number, refreshToken: string) {
  const db = getDb();
  const tokenHash = hashToken(refreshToken);
  const expiresAt = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60;
  db.prepare('INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)')
    .run(userId, tokenHash, expiresAt);
}

// POST /auth/register
router.post('/register', async (req: Request, res: Response) => {
  const { email, username, password } = req.body as {
    email?: string;
    username?: string;
    password?: string;
  };

  if (!email || !username || !password) {
    res.status(400).json({ error: 'email, username and password are required' });
    return;
  }
  if (password.length < 6) {
    res.status(400).json({ error: 'Password must be at least 6 characters' });
    return;
  }

  const db = getDb();
  const existing = db.prepare('SELECT id FROM users WHERE email = ? OR username = ?').get(email, username);
  if (existing) {
    res.status(409).json({ error: 'Email or username already taken' });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const result = db.prepare(
    'INSERT INTO users (email, username, password_hash) VALUES (?, ?, ?)'
  ).run(email.toLowerCase().trim(), username.trim(), passwordHash);

  const userId = result.lastInsertRowid as number;
  const { accessToken, refreshToken } = createTokens(userId);
  saveRefreshToken(userId, refreshToken);

  res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);

  res.status(201).json({
    accessToken,
    user: { id: userId, email: email.toLowerCase().trim(), username: username.trim() },
  });
});

// POST /auth/login
router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    res.status(400).json({ error: 'email and password are required' });
    return;
  }

  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim()) as any;
  if (!user) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const { accessToken, refreshToken } = createTokens(user.id);
  saveRefreshToken(user.id, refreshToken);

  res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);

  res.json({
    accessToken,
    user: { id: user.id, email: user.email, username: user.username },
  });
});

// POST /auth/refresh
router.post('/refresh', (req: Request, res: Response) => {
  const token = req.cookies?.refreshToken as string | undefined;
  if (!token) {
    res.status(401).json({ error: 'No refresh token' });
    return;
  }

  const refreshSecret = process.env.JWT_REFRESH_SECRET;
  if (!refreshSecret) {
    res.status(500).json({ error: 'Server misconfiguration' });
    return;
  }

  let payload: { userId: number };
  try {
    payload = jwt.verify(token, refreshSecret) as { userId: number };
  } catch {
    res.status(401).json({ error: 'Invalid refresh token' });
    return;
  }

  const db = getDb();
  const tokenHash = hashToken(token);
  const now = Math.floor(Date.now() / 1000);
  const stored = db
    .prepare('SELECT id FROM refresh_tokens WHERE user_id = ? AND token_hash = ? AND expires_at > ?')
    .get(payload.userId, tokenHash, now) as any;

  if (!stored) {
    res.status(401).json({ error: 'Refresh token not found or expired' });
    return;
  }

  // Rotate: delete old, issue new
  db.prepare('DELETE FROM refresh_tokens WHERE id = ?').run(stored.id);

  const user = db.prepare('SELECT id, email, username FROM users WHERE id = ?').get(payload.userId) as any;
  if (!user) {
    res.status(401).json({ error: 'User not found' });
    return;
  }

  const { accessToken, refreshToken: newRefreshToken } = createTokens(user.id);
  saveRefreshToken(user.id, newRefreshToken);

  res.cookie('refreshToken', newRefreshToken, COOKIE_OPTIONS);

  res.json({ accessToken, user: { id: user.id, email: user.email, username: user.username } });
});

// POST /auth/logout
router.post('/logout', (req: Request, res: Response) => {
  const token = req.cookies?.refreshToken as string | undefined;
  if (token) {
    const db = getDb();
    db.prepare('DELETE FROM refresh_tokens WHERE token_hash = ?').run(hashToken(token));
  }
  res.clearCookie('refreshToken');
  res.json({ ok: true });
});

// GET /auth/me
router.get('/me', verifyToken, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const user = db.prepare('SELECT id, email, username FROM users WHERE id = ?').get(req.userId) as any;
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json({ user });
});

export default router;
