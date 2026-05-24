import bcrypt from 'bcryptjs';
import { pool } from '../db/pool';
import { config } from '../config';
import {
  generateOtpCode,
  isAllowedEmailDomain,
  validatePassword,
  validatePin,
} from '../utils/validation';
import {
  signFullToken,
  signPartialToken,
  signVerifiedEmailToken,
} from '../utils/jwt';
import { User } from '../types';

export class AuthError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

export async function requestOtp(email: string): Promise<{ message: string; devOtp?: string }> {
  const normalizedEmail = email.trim().toLowerCase();

  if (!isAllowedEmailDomain(normalizedEmail)) {
    throw new AuthError(
      `Email must belong to an allowed domain: ${config.allowedEmailDomains.join(', ')}`,
      403,
    );
  }

  const code = generateOtpCode();
  const expiresAt = new Date(Date.now() + config.otpExpiryMinutes * 60 * 1000);

  await pool.query(
    `INSERT INTO otp_codes (email, code, expires_at)
     VALUES ($1, $2, $3)
     ON CONFLICT (email) DO UPDATE SET code = $2, expires_at = $3`,
    [normalizedEmail, code, expiresAt],
  );

  console.log(`[OTP] ${normalizedEmail}: ${code}`);

  const response: { message: string; devOtp?: string } = {
    message: 'OTP sent to your institutional email',
  };

  if (config.nodeEnv === 'development') {
    response.devOtp = code;
  }

  return response;
}

export async function verifyOtp(email: string, code: string): Promise<{ verifiedEmailToken: string }> {
  const normalizedEmail = email.trim().toLowerCase();

  const result = await pool.query(
    `SELECT code, expires_at FROM otp_codes WHERE email = $1`,
    [normalizedEmail],
  );

  if (result.rows.length === 0) {
    throw new AuthError('OTP not found. Request a new code.', 404);
  }

  const { code: storedCode, expires_at: expiresAt } = result.rows[0];

  if (new Date(expiresAt) < new Date()) {
    throw new AuthError('OTP expired. Request a new code.', 410);
  }

  if (storedCode !== code.trim()) {
    throw new AuthError('Invalid OTP code', 401);
  }

  await pool.query(`DELETE FROM otp_codes WHERE email = $1`, [normalizedEmail]);

  await pool.query(
    `INSERT INTO users (email, is_email_verified)
     VALUES ($1, TRUE)
     ON CONFLICT (email) DO UPDATE SET is_email_verified = TRUE, updated_at = NOW()`,
    [normalizedEmail],
  );

  return { verifiedEmailToken: signVerifiedEmailToken(normalizedEmail) };
}

export async function setupSecurity(
  verifiedEmailToken: string,
  password: string,
  pin: string,
): Promise<{ message: string }> {
  const jwt = await import('../utils/jwt');
  let payload;
  try {
    payload = jwt.verifyToken(verifiedEmailToken, config.jwtSecret);
  } catch {
    throw new AuthError('Invalid or expired verification token', 401);
  }

  if (payload.type !== 'verified_email') {
    throw new AuthError('Invalid verification token type', 401);
  }

  const passwordError = validatePassword(password);
  if (passwordError) {
    throw new AuthError(passwordError);
  }

  const pinError = validatePin(pin);
  if (pinError) {
    throw new AuthError(pinError);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const pinHash = await bcrypt.hash(pin, 12);

  await pool.query(
    `UPDATE users SET
       password_hash = $1,
       pin_hash = $2,
       security_setup_complete = TRUE,
       updated_at = NOW()
     WHERE email = $3`,
    [passwordHash, pinHash, payload.email],
  );

  return { message: 'Security setup complete. You can now log in.' };
}

export async function login(email: string, password: string): Promise<{ partialToken: string }> {
  const normalizedEmail = email.trim().toLowerCase();

  const result = await pool.query<User>(
    `SELECT * FROM users WHERE email = $1`,
    [normalizedEmail],
  );

  if (result.rows.length === 0) {
    throw new AuthError('Invalid email or password', 401);
  }

  const user = result.rows[0];

  if (!user.password_hash) {
    throw new AuthError('Account security setup incomplete', 403);
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    throw new AuthError('Invalid email or password', 401);
  }

  return { partialToken: signPartialToken(user.id, user.email) };
}

export async function verifyPin(
  partialToken: string,
  pin: string,
): Promise<{ accessToken: string; user: { id: string; email: string } }> {
  const jwtUtil = await import('../utils/jwt');
  let payload;
  try {
    payload = jwtUtil.verifyToken(partialToken, config.jwtPartialSecret);
  } catch {
    throw new AuthError('Invalid or expired login session. Please log in again.', 401);
  }

  if (payload.type !== 'partial') {
    throw new AuthError('Invalid login session', 401);
  }

  const pinError = validatePin(pin);
  if (pinError) {
    throw new AuthError(pinError);
  }

  const result = await pool.query<User>(
    `SELECT * FROM users WHERE id = $1`,
    [payload.userId],
  );

  if (result.rows.length === 0) {
    throw new AuthError('User not found', 404);
  }

  const user = result.rows[0];

  if (!user.pin_hash) {
    throw new AuthError('PIN not configured', 403);
  }

  const valid = await bcrypt.compare(pin, user.pin_hash);
  if (!valid) {
    throw new AuthError('Invalid PIN', 401);
  }

  return {
    accessToken: signFullToken(user.id, user.email),
    user: { id: user.id, email: user.email },
  };
}

export async function getUserById(userId: string): Promise<User | null> {
  const result = await pool.query<User>(`SELECT * FROM users WHERE id = $1`, [userId]);
  return result.rows[0] ?? null;
}
