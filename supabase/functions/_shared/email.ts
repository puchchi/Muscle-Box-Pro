// @ts-ignore Deno npm specifier resolved during Supabase function bundling.
import nodemailer from "npm:nodemailer";
import { requireEnv, optionalEnv } from "../../../lib/env.ts";

export interface SendMailOptions {
  from?: string;
  to: string;
  cc?: string;
  subject: string;
  html: string;
}

export async function sendMail(options: SendMailOptions) {
  const transporter = nodemailer.createTransport({
    host: requireEnv("SMTP_HOST"),
    port: Number(optionalEnv("SMTP_PORT", "465")),
    secure: optionalEnv("SMTP_SECURE", "true") === "true",
    auth: {
      user: requireEnv("SMTP_USER"),
      pass: requireEnv("SMTP_PASS"),
    },
  });

  const from =
    options.from ||
    optionalEnv("SMTP_FROM", "Muscle Box Pro <no-reply@muscleboxpro.com>");

  await transporter.sendMail({
    from,
    to: options.to,
    cc: options.cc,
    subject: options.subject,
    html: options.html,
  });
}
