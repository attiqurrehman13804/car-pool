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
import { sendOtpEmail, sendLockoutEmail, sendPasswordResetEmail } from './email.service';
import { User } from '../types';
import { checkAccountNotLocked } from '../middleware/account';

export class AuthError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

async function isPasswordReused(userId: string, password: string): Promise<boolean> {
  const history = await pool.query<{ password_hash: string }>(
    `SELECT password_hash FROM password_history
     WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`,
    [userId, config.passwordHistoryCount],
  );
  for (const row of history.rows) {
    if (await bcrypt.compare(password, row.password_hash)) return true;
  }
  const user = await pool.query<{ password_hash: string }>(
    `SELECT password_hash FROM users WHERE id = $1`,
    [userId],
  );
  if (user.rows[0]?.password_hash && await bcrypt.compare(password, user.rows[0].password_hash)) {
    return true;
  }
  return false;
}

async function savePasswordHistory(userId: string, passwordHash: string): Promise<void> {
  await pool.query(
    `INSERT INTO password_history (user_id, password_hash) VALUES ($1, $2)`,
    [userId, passwordHash],
  );
}

export async function requestOtp(
  email: string,
): Promise<{ message: string; devOtp?: string }> {
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

  await sendOtpEmail(normalizedEmail, code);

  const response: { message: string; devOtp?: string } = {
    message: 'OTP sent to your institutional email',
  };
  if (config.nodeEnv === 'development') {
    response.devOtp = code;
  }
  return response;
}

export async function verifyOtp(
  email: string,
  code: string,
): Promise<{ verifiedEmailToken: string }> {
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
  if (passwordError) throw new AuthError(passwordError);
  const pinError = validatePin(pin);
  if (pinError) throw new AuthError(pinError);

  const passwordHash = await bcrypt.hash(password, 12);
  const pinHash = await bcrypt.hash(pin, 12);

  const userResult = await pool.query<{ id: string }>(
    `SELECT id FROM users WHERE email = $1`,
    [payload.email],
  );
  const userId = userResult.rows[0]?.id;

  await pool.query(
    `UPDATE users SET password_hash = $1, pin_hash = $2, security_setup_complete = TRUE, updated_at = NOW()
     WHERE email = $3`,
    [passwordHash, pinHash, payload.email],
  );
  if (userId) {
    await savePasswordHistory(userId, passwordHash);
  }
  return { message: 'Security setup complete. You can now log in.' };
}

export async function login(
  email: string,
  password: string,
): Promise<{ partialToken: string }> {
  const normalizedEmail = email.trim().toLowerCase();
  const result = await pool.query<User>(`SELECT * FROM users WHERE email = $1`, [normalizedEmail]);
  if (result.rows.length === 0) {
    throw new AuthError('Invalid email or password', 401);
  }
  const user = result.rows[0];
  const lockStatus = await checkAccountNotLocked(user.id);
  if (lockStatus.locked) {
    throw new AuthError('Account is locked. Try again later.', 423);
  }
  if (!user.password_hash) {
    throw new AuthError('Account security setup incomplete', 403);
  }
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) throw new AuthError('Invalid email or password', 401);
  return { partialToken: signPartialToken(user.id, user.email) };
}

export async function verifyPin(
  partialToken: string,
  pin: string,
): Promise<{ accessToken: string; user: { id: string; email: string; isAdmin: boolean } }> {
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
  if (pinError) throw new AuthError(pinError);

  const result = await pool.query<User & { is_admin: boolean }>(
    `SELECT * FROM users WHERE id = $1`,
    [payload.userId],
  );
  if (result.rows.length === 0) throw new AuthError('User not found', 404);
  const user = result.rows[0];

  const lockStatus = await checkAccountNotLocked(user.id);
  if (lockStatus.locked) {
    throw new AuthError('Account is locked due to failed PIN attempts.', 423);
  }
  if (!user.pin_hash) throw new AuthError('PIN not configured', 403);

  const valid = await bcrypt.compare(pin, user.pin_hash);
  if (!valid) {
    const attempts = (user as User & { pin_failed_attempts?: number }).pin_failed_attempts ?? 0;
    const newAttempts = attempts + 1;
    if (newAttempts >= config.maxPinAttempts) {
      const lockedUntil = new Date(Date.now() + config.lockoutMinutes * 60 * 1000);
      await pool.query(
        `UPDATE users SET pin_failed_attempts = $1, status = 'locked', locked_until = $2 WHERE id = $3`,
        [newAttempts, lockedUntil, user.id],
      );
      await sendLockoutEmail(user.email);
      throw new AuthError('Account locked after too many failed attempts.', 423);
    }
    await pool.query(`UPDATE users SET pin_failed_attempts = $1 WHERE id = $2`, [newAttempts, user.id]);
    throw new AuthError(`Invalid PIN. ${config.maxPinAttempts - newAttempts} attempts remaining.`, 401);
  }

  await pool.query(
    `UPDATE users SET pin_failed_attempts = 0, status = 'active', locked_until = NULL WHERE id = $1`,
    [user.id],
  );

  return {
    accessToken: signFullToken(user.id, user.email),
    user: { id: user.id, email: user.email, isAdmin: user.is_admin ?? false },
  };
}

export async function changePassword(
  userId: string,
  oldPassword: string,
  newPassword: string,
): Promise<{ message: string }> {
  const passwordError = validatePassword(newPassword);
  if (passwordError) throw new AuthError(passwordError);

  const result = await pool.query<User>(`SELECT * FROM users WHERE id = $1`, [userId]);
  const user = result.rows[0];
  if (!user?.password_hash) throw new AuthError('User not found', 404);

  const valid = await bcrypt.compare(oldPassword, user.password_hash);
  if (!valid) throw new AuthError('Current password is incorrect', 401);

  if (await isPasswordReused(userId, newPassword)) {
    throw new AuthError('Cannot reuse a recent password', 400);
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await savePasswordHistory(userId, user.password_hash);
  await pool.query(
    `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`,
    [passwordHash, userId],
  );
  return { message: 'Password updated successfully' };
}

export async function changePin(userId: string, email: string, otp: string, newPin: string): Promise<{ message: string }> {
  const pinError = validatePin(newPin);
  if (pinError) throw new AuthError(pinError);

  const otpResult = await pool.query(
    `SELECT code, expires_at FROM otp_codes WHERE email = $1`,
    [email.trim().toLowerCase()],
  );
  if (otpResult.rows.length === 0) throw new AuthError('OTP not found', 404);
  const { code, expires_at: expiresAt } = otpResult.rows[0];
  if (new Date(expiresAt) < new Date()) throw new AuthError('OTP expired', 410);
  if (code !== otp.trim()) throw new AuthError('Invalid OTP', 401);

  const pinHash = await bcrypt.hash(newPin, 12);
  await pool.query(`UPDATE users SET pin_hash = $1, updated_at = NOW() WHERE id = $2`, [pinHash, userId]);
  await pool.query(`DELETE FROM otp_codes WHERE email = $1`, [email.trim().toLowerCase()]);
  return { message: 'PIN updated successfully' };
}

export async function forgotPassword(email: string): Promise<{ message: string; devOtp?: string }> {
  const normalizedEmail = email.trim().toLowerCase();
  const result = await pool.query(`SELECT id FROM users WHERE email = $1`, [normalizedEmail]);
  if (result.rows.length === 0) {
    return { message: 'If the email exists, a reset code has been sent' };
  }
  const code = generateOtpCode();
  const expiresAt = new Date(Date.now() + config.otpExpiryMinutes * 60 * 1000);
  await pool.query(
    `INSERT INTO otp_codes (email, code, expires_at)
     VALUES ($1, $2, $3)
     ON CONFLICT (email) DO UPDATE SET code = $2, expires_at = $3`,
    [normalizedEmail, code, expiresAt],
  );
  await sendPasswordResetEmail(normalizedEmail, code);
  const response: { message: string; devOtp?: string } = {
    message: 'If the email exists, a reset code has been sent',
  };
  if (config.nodeEnv === 'development') response.devOtp = code;
  return response;
}

export async function resetPassword(
  email: string,
  otp: string,
  newPassword: string,
): Promise<{ message: string }> {
  const normalizedEmail = email.trim().toLowerCase();
  const passwordError = validatePassword(newPassword);
  if (passwordError) throw new AuthError(passwordError);

  const otpResult = await pool.query(
    `SELECT code, expires_at FROM otp_codes WHERE email = $1`,
    [normalizedEmail],
  );
  if (otpResult.rows.length === 0) throw new AuthError('OTP not found', 404);
  const { code, expires_at: expiresAt } = otpResult.rows[0];
  if (new Date(expiresAt) < new Date()) throw new AuthError('OTP expired', 410);
  if (code !== otp.trim()) throw new AuthError('Invalid OTP', 401);

  const userResult = await pool.query<{ id: string; password_hash: string }>(
    `SELECT id, password_hash FROM users WHERE email = $1`,
    [normalizedEmail],
  );
  const user = userResult.rows[0];
  if (!user) throw new AuthError('User not found', 404);
  if (await isPasswordReused(user.id, newPassword)) {
    throw new AuthError('Cannot reuse a recent password', 400);
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  if (user.password_hash) await savePasswordHistory(user.id, user.password_hash);
  await pool.query(
    `UPDATE users SET password_hash = $1, pin_failed_attempts = 0, status = 'active', locked_until = NULL, updated_at = NOW()
     WHERE id = $2`,
    [passwordHash, user.id],
  );
  await pool.query(`DELETE FROM otp_codes WHERE email = $1`, [normalizedEmail]);
  return { message: 'Password reset successfully' };
}

export async function getUserById(userId: string): Promise<(User & {
  full_name: string | null;
  phone: string | null;
  profile_photo_url: string | null;
  is_admin: boolean;
  default_role: string;
}) | null> {
  const result = await pool.query(
    `SELECT id, email, is_email_verified, security_setup_complete, full_name, phone,
            profile_photo_url, is_admin, default_role, status, created_at, updated_at
     FROM users WHERE id = $1`,
    [userId],
  );
  return result.rows[0] ?? null;
}
