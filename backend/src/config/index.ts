import dotenv from 'dotenv';

dotenv.config();

function requireEnv(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const config = {
  port: parseInt(process.env.PORT ?? '3000', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  databaseUrl: requireEnv('DATABASE_URL'),
  jwtSecret: requireEnv('JWT_SECRET'),
  jwtPartialSecret: requireEnv('JWT_PARTIAL_SECRET'),
  allowedEmailDomains: requireEnv('ALLOWED_EMAIL_DOMAINS', 'university.edu')
    .split(',')
    .map(d => d.trim().toLowerCase())
    .filter(Boolean),
  otpExpiryMinutes: parseInt(process.env.OTP_EXPIRY_MINUTES ?? '10', 10),
  corsOrigin: process.env.CORS_ORIGIN ?? '*',
  smtp: {
    host: process.env.SMTP_HOST ?? '',
    port: parseInt(process.env.SMTP_PORT ?? '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER ?? '',
    pass: process.env.SMTP_PASS ?? '',
    from: process.env.SMTP_FROM ?? 'Pool Bus <noreply@poolbus.app>',
  },
  maxPinAttempts: parseInt(process.env.MAX_PIN_ATTEMPTS ?? '3', 10),
  lockoutMinutes: parseInt(process.env.LOCKOUT_MINUTES ?? '30', 10),
  passwordHistoryCount: parseInt(process.env.PASSWORD_HISTORY_COUNT ?? '3', 10),
  matchingTimeWindowMinutes: parseInt(process.env.MATCHING_TIME_WINDOW_MINUTES ?? '15', 10),
  matchingDistanceMeters: parseInt(process.env.MATCHING_DISTANCE_METERS ?? '500', 10),
  geofenceArrivalMeters: parseInt(process.env.GEOFENCE_ARRIVAL_METERS ?? '200', 10),
  adminEmail: process.env.ADMIN_EMAIL ?? 'admin@university.edu',
};
