import nodemailer from 'nodemailer';
import { env } from '../lib/env';

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_PORT === 465,
  auth:
    env.SMTP_USER && env.SMTP_PASS
      ? { user: env.SMTP_USER, pass: env.SMTP_PASS }
      : undefined,
});

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export const sendEmail = async (options: EmailOptions): Promise<void> => {
  if (!env.SMTP_HOST || !env.SMTP_USER) {
    console.warn('Email not configured — skipping email send to:', options.to);
    return;
  }
  try {
    await transporter.sendMail({
      from: env.EMAIL_FROM,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });
  } catch (error) {
    console.error('Failed to send email:', error);
  }
};

export const emailTemplates = {
  verifyEmail: (name: string, link: string) => ({
    subject: 'Verify your Collabo account',
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
        <h2>Welcome to Collabo, ${name}!</h2>
        <p>Please verify your email address to get started.</p>
        <a href="${link}" style="background:#6366f1;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin:16px 0;">Verify Email</a>
        <p style="color:#64748b;font-size:14px;">Link expires in 24 hours. If you didn't create an account, ignore this email.</p>
      </div>
    `,
  }),

  resetPassword: (name: string, link: string) => ({
    subject: 'Reset your Collabo password',
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
        <h2>Password Reset Request</h2>
        <p>Hi ${name}, we received a request to reset your password.</p>
        <a href="${link}" style="background:#6366f1;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin:16px 0;">Reset Password</a>
        <p style="color:#64748b;font-size:14px;">Link expires in 1 hour. If you didn't request this, ignore this email.</p>
      </div>
    `,
  }),

  projectInvite: (inviterName: string, projectName: string, link: string) => ({
    subject: `You've been invited to join ${projectName} on Collabo`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
        <h2>Project Invitation</h2>
        <p><strong>${inviterName}</strong> has invited you to join <strong>${projectName}</strong> on Collabo.</p>
        <a href="${link}" style="background:#6366f1;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin:16px 0;">Accept Invitation</a>
        <p style="color:#64748b;font-size:14px;">This invitation expires in 7 days.</p>
      </div>
    `,
  }),

  taskAssigned: (assigneeName: string, taskTitle: string, projectName: string, link: string) => ({
    subject: `Task assigned: ${taskTitle}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
        <h2>You've been assigned a task</h2>
        <p>Hi ${assigneeName}, you have been assigned the task <strong>"${taskTitle}"</strong> in project <strong>${projectName}</strong>.</p>
        <a href="${link}" style="background:#6366f1;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin:16px 0;">View Task</a>
      </div>
    `,
  }),
};
