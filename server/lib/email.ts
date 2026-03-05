import nodemailer from "nodemailer";
import { env } from "../config/env";
import {
  getPasswordResetEmailTemplate,
  getVerificationEmailTemplate,
} from "./emailTemplates";

function createTransporter() {
  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: Number(env.SMTP_PORT || "587"),
    secure: env.SMTP_SECURE ?? false,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  });
}

export async function sendVerificationEmail(input: {
  to: string;
  verificationUrl: string;
  name?: string;
}) {
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS || !env.SMTP_FROM) {
    throw new Error(
      "Custom email verification is not configured. Missing SMTP_HOST/SMTP_USER/SMTP_PASS/SMTP_FROM.",
    );
  }

  const transporter = createTransporter();

  const { subject, text, html } = getVerificationEmailTemplate({
    name: input.name,
    verificationUrl: input.verificationUrl,
  });

  await transporter.sendMail({
    from: env.SMTP_FROM,
    to: input.to,
    subject,
    text,
    html,
  });
}

export async function sendPasswordResetEmail(input: {
  to: string;
  resetUrl: string;
  name?: string;
}) {
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS || !env.SMTP_FROM) {
    throw new Error(
      "Custom password reset email is not configured. Missing SMTP_HOST/SMTP_USER/SMTP_PASS/SMTP_FROM.",
    );
  }

  const transporter = createTransporter();
  const { subject, text, html } = getPasswordResetEmailTemplate({
    name: input.name,
    resetUrl: input.resetUrl,
  });

  await transporter.sendMail({
    from: env.SMTP_FROM,
    to: input.to,
    subject,
    text,
    html,
  });
}
