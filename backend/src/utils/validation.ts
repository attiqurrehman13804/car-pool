import { config } from '../config';

export function isAllowedEmailDomain(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return false;
  return config.allowedEmailDomains.includes(domain);
}

export function validatePassword(password: string): string | null {
  if (password.length < 8) {
    return 'Password must be at least 8 characters';
  }
  if (!/[A-Z]/.test(password)) {
    return 'Password must contain an uppercase letter';
  }
  if (!/[a-z]/.test(password)) {
    return 'Password must contain a lowercase letter';
  }
  if (!/[0-9]/.test(password)) {
    return 'Password must contain a number';
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return 'Password must contain a special character';
  }
  return null;
}

export function validatePin(pin: string): string | null {
  if (!/^\d{6}$/.test(pin)) {
    return 'PIN must be exactly 6 digits';
  }
  return null;
}

export function generateOtpCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function generatePickupOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
