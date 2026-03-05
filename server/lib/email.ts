import nodemailer from "nodemailer";
import { env } from "../config/env";
import { getVerificationEmailTemplate } from "./emailTemplates";

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

  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: Number(env.SMTP_PORT || "587"),
    secure: env.SMTP_SECURE ?? false,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  });

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
