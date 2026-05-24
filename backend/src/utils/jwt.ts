import jwt from 'jsonwebtoken';
import { config } from '../config';
import { JwtPayload } from '../types';

export function signVerifiedEmailToken(email: string): string {
  const payload: JwtPayload = {
    userId: '',
    email,
    type: 'verified_email',
  };
  return jwt.sign(payload, config.jwtSecret, { expiresIn: '30m' });
}

export function signPartialToken(userId: string, email: string): string {
  const payload: JwtPayload = {
    userId,
    email,
    type: 'partial',
  };
  return jwt.sign(payload, config.jwtPartialSecret, { expiresIn: '5m' });
}

export function signFullToken(userId: string, email: string): string {
  const payload: JwtPayload = {
    userId,
    email,
    type: 'full',
  };
  return jwt.sign(payload, config.jwtSecret, { expiresIn: '24h' });
}

export function verifyToken(token: string, secret: string): JwtPayload {
  return jwt.verify(token, secret) as JwtPayload;
}
