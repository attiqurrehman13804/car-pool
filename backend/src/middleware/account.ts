import { Response, NextFunction } from 'express';
import { pool } from '../db/pool';
import { AuthRequest } from './auth';

export async function requireAdmin(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  try {
    const result = await pool.query<{ is_admin: boolean }>(
      `SELECT is_admin FROM users WHERE id = $1`,
      [req.user.userId],
    );
    if (!result.rows[0]?.is_admin) {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }
    next();
  } catch {
    res.status(500).json({ error: 'Authorization check failed' });
  }
}

export async function checkAccountNotLocked(userId: string): Promise<{
  locked: boolean;
  lockedUntil?: Date;
}> {
  const result = await pool.query<{ status: string; locked_until: Date | null }>(
    `SELECT status, locked_until FROM users WHERE id = $1`,
    [userId],
  );
  const user = result.rows[0];
  if (!user) return { locked: true };
  if (user.status === 'locked') {
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      return { locked: true, lockedUntil: user.locked_until };
    }
    await pool.query(
      `UPDATE users SET status = 'active', pin_failed_attempts = 0, locked_until = NULL WHERE id = $1`,
      [userId],
    );
  }
  return { locked: false };
}
