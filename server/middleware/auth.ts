import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  userId?: number;
}

const DEV_AUTH_BYPASS_USER_ID = 999001;

function getUsersDb(): import('better-sqlite3').Database | null {
  return ((globalThis as any).__usersDb as import('better-sqlite3').Database | undefined) ?? null;
}

export function tryGetUserId(req: Request): number | null {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const devAuthBypassEnabled = process.env.NODE_ENV !== 'production' && process.env.DEV_AUTH_BYPASS === '1';

  if (devAuthBypassEnabled && (!token || token === 'dev-bypass')) {
    return DEV_AUTH_BYPASS_USER_ID;
  }

  if (!token) {
    return null;
  }

  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) {
    return null;
  }

  try {
    const payload = jwt.verify(token, secret) as { userId: number };
    return payload.userId;
  } catch {
    return null;
  }
}

export function verifyToken(req: AuthRequest, res: Response, next: NextFunction): void {
  const userId = tryGetUserId(req);

  if (!userId) {
    res.status(401).json({ error: 'Missing token' });
    return;
  }

  const db = getUsersDb();
  if (db) {
    const user = db.prepare('SELECT id FROM users WHERE id = ?').get(userId) as { id: number } | undefined;
    if (!user) {
      res.status(401).json({ error: 'Ungueltige Sitzung. Bitte neu anmelden.' });
      return;
    }
  }

  req.userId = userId;
  next();
}
