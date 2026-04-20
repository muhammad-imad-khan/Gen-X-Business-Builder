import nodemailer from 'nodemailer';
import { config } from '../config';
import { logger } from './logger';

const transporter = config.smtp.host
  ? nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: {
        user: config.smtp.user,
        pass: config.smtp.pass,
      },
    })
  : null;

export function generateVerificationCode(): string {
  // 6-digit numeric code
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function sendVerificationEmail(to: string, code: string, name?: string): Promise<void> {
  const subject = 'Verify your Gen X account';
  const verifyLink = `${config.appUrl}/verify-email?email=${encodeURIComponent(to)}&code=${encodeURIComponent(code)}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
      <h2 style="color: #6366f1; margin-bottom: 8px;">Gen X Business Builder</h2>
      <p>Hi${name ? ` ${name}` : ''},</p>
      <p>Your verification code is:</p>
      <div style="background: #f3f4f6; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0;">
        <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1f2937;">${code}</span>
      </div>
      <p style="margin: 24px 0;">Or click the button below to verify your email instantly:</p>
      <div style="text-align: center; margin: 24px 0;">
        <a href="${verifyLink}" style="display: inline-block; background: #6366f1; color: #ffffff; font-weight: 600; font-size: 16px; padding: 14px 32px; border-radius: 12px; text-decoration: none;">Verify Email</a>
      </div>
      <p style="color: #6b7280; font-size: 14px;">This code expires in 10 minutes. If you didn't create an account, you can ignore this email.</p>
    </div>
  `;

  await sendMail(to, subject, html);
}

export async function sendPasswordResetEmail(to: string, code: string, name?: string): Promise<void> {
  const subject = 'Reset your Gen X password';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
      <h2 style="color: #6366f1; margin-bottom: 8px;">Gen X Business Builder</h2>
      <p>Hi${name ? ` ${name}` : ''},</p>
      <p>Your password reset code is:</p>
      <div style="background: #f3f4f6; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0;">
        <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1f2937;">${code}</span>
      </div>
      <p style="color: #6b7280; font-size: 14px;">This code expires in 10 minutes. If you didn't request a password reset, you can ignore this email.</p>
    </div>
  `;

  await sendMail(to, subject, html);
}

async function sendMail(to: string, subject: string, html: string): Promise<void> {
  if (!transporter) {
    // In development without SMTP, log the email instead
    logger.warn({ to, subject }, 'SMTP not configured — email not sent. Set SMTP_HOST, SMTP_USER, SMTP_PASS env vars.');
    logger.info({ to, subject, html }, 'Email content (dev mode)');
    return;
  }

  try {
    await transporter.sendMail({
      from: config.smtp.from,
      to,
      subject,
      html,
    });
    logger.info({ to, subject }, 'Email sent');
  } catch (err) {
    logger.error({ err, to, subject }, 'Failed to send email');
    throw new Error('Failed to send email');
  }
}
