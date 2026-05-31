import dotenv from 'dotenv';

dotenv.config();

function requireEnv(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  console.log("this is valuee     ", value)
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
  allowedEmailDomains: requireEnv('ALLOWED_EMAIL_DOMAINS', 'gmail.com')
    .split(',')
    .map(d => d.trim().toLowerCase())
    .filter(Boolean),
  otpExpiryMinutes: parseInt(process.env.OTP_EXPIRY_MINUTES ?? '10', 10),
  corsOrigin: process.env.CORS_ORIGIN ?? '*',
};
