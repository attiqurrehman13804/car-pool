import { Request, Response, NextFunction } from 'express';
import { config } from '../config';
import { verifyToken } from '../utils/jwt';
import { JwtPayload } from '../types';

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export function requireFullAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const token = header.slice(7);
  try {
    const payload = verifyToken(token, config.jwtSecret);
    if (payload.type !== 'full') {
      res.status(401).json({ error: 'Full authentication required. Complete PIN verification.' });
      return;
    }
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireVerifiedEmail(req: AuthRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Verification token required' });
    return;
  }

  const token = header.slice(7);
  try {
    const payload = verifyToken(token, config.jwtSecret);
    if (payload.type !== 'verified_email') {
      res.status(401).json({ error: 'Invalid verification token' });
      return;
    }
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired verification token' });
  }
}
