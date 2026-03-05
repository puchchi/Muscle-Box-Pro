import nodemailer from "nodemailer";
import { env } from "../config/env";
import {
  getCampaignRequestEmailTemplate,
  getDemoRequestEmailTemplate,
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

export async function sendDemoRequestEmail(input: {
  to: string;
  name: string;
  gymName: string;
  email: string;
  location: string;
  mobile: string;
  message?: string;
}) {
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS || !env.SMTP_FROM) {
    throw new Error(
      "Demo request email is not configured. Missing SMTP_HOST/SMTP_USER/SMTP_PASS/SMTP_FROM.",
    );
  }

  const transporter = createTransporter();
  const { subject, text, html } = getDemoRequestEmailTemplate({
    name: input.name,
    gymName: input.gymName,
    email: input.email,
    mobile: input.mobile,
    location: input.location,
    message: input.message,
  });

  await transporter.sendMail({
    from: env.SMTP_FROM,
    to: input.to,
    cc: env.DEMO_REQUEST_CC,
    subject,
    text,
    html,
  });
}

export async function sendCampaignRequestEmail(input: {
  to: string;
  brandName: string;
  email: string;
  mobile: string;
}) {
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS || !env.SMTP_FROM) {
    throw new Error(
      "Campaign request email is not configured. Missing SMTP_HOST/SMTP_USER/SMTP_PASS/SMTP_FROM.",
    );
  }

  const transporter = createTransporter();
  const { subject, text, html } = getCampaignRequestEmailTemplate({
    brandName: input.brandName,
    email: input.email,
    mobile: input.mobile,
  });

  await transporter.sendMail({
    from: env.SMTP_FROM,
    to: input.to,
    cc: env.CAMPAIGN_REQUEST_CC,
    subject,
    text,
    html,
  });
}
