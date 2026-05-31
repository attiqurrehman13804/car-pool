import nodemailer from 'nodemailer';
import { config } from '../config';

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (!config.smtp.host || !config.smtp.user) {
    return null;
  }
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: { user: config.smtp.user, pass: config.smtp.pass },
    });
  }
  return transporter;
}

export async function sendEmail(
  to: string,
  subject: string,
  html: string,
): Promise<void> {
  const transport = getTransporter();
  if (transport) {
    await transport.sendMail({
      from: config.smtp.from,
      to,
      subject,
      html,
    });
    return;
  }
  console.log(`[EMAIL] To: ${to} | Subject: ${subject}\n${html}`);
}

export async function sendOtpEmail(email: string, code: string): Promise<void> {
  await sendEmail(
    email,
    'Pool Bus — Verification Code',
    `<p>Your verification code is: <strong>${code}</strong></p><p>Expires in ${config.otpExpiryMinutes} minutes.</p>`,
  );
}

export async function sendLockoutEmail(email: string): Promise<void> {
  await sendEmail(
    email,
    'Pool Bus — Account Locked',
    `<p>Your account was temporarily locked due to multiple failed PIN attempts.</p>`,
  );
}

export async function sendPasswordResetEmail(email: string, code: string): Promise<void> {
  await sendEmail(
    email,
    'Pool Bus — Password Reset Code',
    `<p>Your password reset code is: <strong>${code}</strong></p>`,
  );
}

export async function sendSosAlertEmail(
  emails: string[],
  userEmail: string,
  lat: number,
  lng: number,
): Promise<void> {
  const mapLink = `https://maps.google.com/?q=${lat},${lng}`;
  for (const to of emails) {
    await sendEmail(
      to,
      'Pool Bus — SOS EMERGENCY',
      `<p><strong>SOS triggered by ${userEmail}</strong></p><p>Location: <a href="${mapLink}">${lat}, ${lng}</a></p>`,
    );
  }
}
