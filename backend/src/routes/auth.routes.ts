import { Router, Response } from 'express';
import { z } from 'zod';
import {
  login,
  requestOtp,
  setupSecurity,
  verifyOtp,
  verifyPin,
  getUserById,
  AuthError,
} from '../services/auth.service';
import { AuthRequest, requireFullAuth, requireVerifiedEmail } from '../middleware/auth';

const router = Router();

const emailSchema = z.object({
  email: z.string().email(),
});

const otpVerifySchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
});

const securitySetupSchema = z.object({
  password: z.string().min(8),
  pin: z.string().length(6),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const pinSchema = z.object({
  pin: z.string().length(6),
});

function handleAuthError(res: Response, error: unknown): void {
  if (error instanceof AuthError) {
    res.status(error.statusCode).json({ error: error.message });
    return;
  }
  console.error(error);
  res.status(500).json({ error: 'Internal server error' });
}

router.post('/request-otp', async (req, res) => {
  try {
    const { email } = emailSchema.parse(req.body);
    const result = await requestOtp(email);
    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid email address' });
      return;
    }
    handleAuthError(res, error);
  }
});

router.post('/verify-otp', async (req, res) => {
  try {
    const { email, code } = otpVerifySchema.parse(req.body);
    const result = await verifyOtp(email, code);
    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid OTP payload' });
      return;
    }
    handleAuthError(res, error);
  }
});

router.post('/setup-security', requireVerifiedEmail, async (req: AuthRequest, res) => {
  try {
    const { password, pin } = securitySetupSchema.parse(req.body);
    const token = req.headers.authorization!.slice(7);
    const result = await setupSecurity(token, password, pin);
    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid security setup payload' });
      return;
    }
    handleAuthError(res, error);
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const result = await login(email, password);
    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid login payload' });
      return;
    }
    handleAuthError(res, error);
  }
});

router.post('/verify-pin', async (req, res) => {
  try {
    const { pin } = pinSchema.parse(req.body);
    const partialHeader = req.headers['x-partial-token'];
    if (!partialHeader || typeof partialHeader !== 'string') {
      res.status(401).json({ error: 'Partial login token required' });
      return;
    }
    const result = await verifyPin(partialHeader, pin);
    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid PIN payload' });
      return;
    }
    handleAuthError(res, error);
  }
});

router.get('/me', requireFullAuth, async (req: AuthRequest, res) => {
  try {
    const user = await getUserById(req.user!.userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json({
      user: {
        id: user.id,
        email: user.email,
        isEmailVerified: user.is_email_verified,
        securitySetupComplete: user.security_setup_complete,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

export default router;
