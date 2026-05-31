import { Router, Response } from 'express';
import { z } from 'zod';
import {
  login,
  requestOtp,
  setupSecurity,
  verifyOtp,
  verifyPin,
  getUserById,
  changePassword,
  changePin,
  forgotPassword,
  resetPassword,
  AuthError,
} from '../services/auth.service';
import { AuthRequest, requireFullAuth, requireVerifiedEmail } from '../middleware/auth';
import { authRateLimit, otpRateLimit } from '../middleware/rateLimit';

const router = Router();

const emailSchema = z.object({ email: z.string().email() });
const otpVerifySchema = z.object({ email: z.string().email(), code: z.string().length(6) });
const securitySetupSchema = z.object({ password: z.string().min(8), pin: z.string().length(6) });
const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });
const pinSchema = z.object({ pin: z.string().length(6) });
const changePasswordSchema = z.object({ oldPassword: z.string(), newPassword: z.string().min(8) });
const changePinSchema = z.object({ otp: z.string().length(6), newPin: z.string().length(6) });
const resetPasswordSchema = z.object({ email: z.string().email(), otp: z.string().length(6), newPassword: z.string().min(8) });

function handleAuthError(res: Response, error: unknown): void {
  if (error instanceof AuthError) {
    res.status(error.statusCode).json({ error: error.message });
    return;
  }
  console.error(error);
  res.status(500).json({ error: 'Internal server error' });
}

router.post('/request-otp', otpRateLimit, authRateLimit, async (req, res) => {
  try {
    const { email } = emailSchema.parse(req.body);
    res.json(await requestOtp(email));
  } catch (error) {
    if (error instanceof z.ZodError) { res.status(400).json({ error: 'Invalid email address' }); return; }
    handleAuthError(res, error);
  }
});

router.post('/verify-otp', authRateLimit, async (req, res) => {
  try {
    const { email, code } = otpVerifySchema.parse(req.body);
    res.json(await verifyOtp(email, code));
  } catch (error) {
    if (error instanceof z.ZodError) { res.status(400).json({ error: 'Invalid OTP payload' }); return; }
    handleAuthError(res, error);
  }
});

router.post('/setup-security', requireVerifiedEmail, async (req: AuthRequest, res) => {
  try {
    const { password, pin } = securitySetupSchema.parse(req.body);
    const token = req.headers.authorization!.slice(7);
    res.json(await setupSecurity(token, password, pin));
  } catch (error) {
    if (error instanceof z.ZodError) { res.status(400).json({ error: 'Invalid security setup payload' }); return; }
    handleAuthError(res, error);
  }
});

router.post('/login', authRateLimit, async (req, res) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    res.json(await login(email, password));
  } catch (error) {
    if (error instanceof z.ZodError) { res.status(400).json({ error: 'Invalid login payload' }); return; }
    handleAuthError(res, error);
  }
});

router.post('/verify-pin', authRateLimit, async (req, res) => {
  try {
    const { pin } = pinSchema.parse(req.body);
    const partialHeader = req.headers['x-partial-token'];
    if (!partialHeader || typeof partialHeader !== 'string') {
      res.status(401).json({ error: 'Partial login token required' });
      return;
    }
    res.json(await verifyPin(partialHeader, pin));
  } catch (error) {
    if (error instanceof z.ZodError) { res.status(400).json({ error: 'Invalid PIN payload' }); return; }
    handleAuthError(res, error);
  }
});

router.post('/forgot-password', otpRateLimit, async (req, res) => {
  try {
    const { email } = emailSchema.parse(req.body);
    res.json(await forgotPassword(email));
  } catch (error) {
    handleAuthError(res, error);
  }
});

router.post('/reset-password', authRateLimit, async (req, res) => {
  try {
    const { email, otp, newPassword } = resetPasswordSchema.parse(req.body);
    res.json(await resetPassword(email, otp, newPassword));
  } catch (error) {
    handleAuthError(res, error);
  }
});

router.put('/change-password', requireFullAuth, async (req: AuthRequest, res) => {
  try {
    const { oldPassword, newPassword } = changePasswordSchema.parse(req.body);
    res.json(await changePassword(req.user!.userId, oldPassword, newPassword));
  } catch (error) {
    handleAuthError(res, error);
  }
});

router.put('/change-pin', requireFullAuth, async (req: AuthRequest, res) => {
  try {
    const { otp, newPin } = changePinSchema.parse(req.body);
    res.json(await changePin(req.user!.userId, req.user!.email, otp, newPin));
  } catch (error) {
    handleAuthError(res, error);
  }
});

router.get('/me', requireFullAuth, async (req: AuthRequest, res) => {
  try {
    const user = await getUserById(req.user!.userId);
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }
    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

export default router;
