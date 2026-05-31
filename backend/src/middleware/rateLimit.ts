import rateLimit from 'express-rate-limit';

export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: 'Too many requests. Try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const otpRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 3,
  message: { error: 'Too many OTP requests. Wait a minute.' },
});
