import nodemailer from "nodemailer";
import { env } from "../config/env";

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

  const subject = "Verify your Muscle Box Pro account";
  const greeting = input.name ? `Hi ${input.name},` : "Hi,";
  const html = `
    <p>${greeting}</p>
    <p>Thanks for signing up for Muscle Box Pro.</p>
    <p>Please verify your email address by clicking the link below:</p>
    <p><a href="${input.verificationUrl}">${input.verificationUrl}</a></p>
    <p>If you did not create this account, you can ignore this email.</p>
  `;

  const text = [
    greeting,
    "",
    "Thanks for signing up for Muscle Box Pro.",
    "Please verify your email address by opening the link below:",
    input.verificationUrl,
    "",
    "If you did not create this account, you can ignore this email.",
  ].join("\n");

  await transporter.sendMail({
    from: env.SMTP_FROM,
    to: input.to,
    subject,
    text,
    html,
  });
}
