// @ts-ignore Deno npm specifier resolved during Supabase function bundling.
import { SignJWT, jwtVerify } from "npm:jose@5.9.6";
import { requireEnv, optionalEnv } from "../../../lib/env.ts";
import { getVerificationEmailTemplate } from "../../../emailTemplate.ts";
import { sendMail } from "./email.ts";

const encoder = new TextEncoder();

function getVerificationSecret() {
  return encoder.encode(requireEnv("EMAIL_VERIFICATION_SECRET"));
}

export async function createVerificationToken(input: {
  userId: string;
  email: string;
}) {
  const expiresInMinutes = Number(optionalEnv("EMAIL_VERIFICATION_TTL_MINUTES", "60"));
  return await new SignJWT({ type: "email_verification", email: input.email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(input.userId)
    .setIssuedAt()
    .setExpirationTime(`${expiresInMinutes}m`)
    .sign(getVerificationSecret());
}

export async function verifyVerificationToken(token: string) {
  return await jwtVerify(token, getVerificationSecret(), { algorithms: ["HS256"] });
}

function getVerificationUrl(token: string) {
  const baseUrl = optionalEnv(
    "EMAIL_VERIFICATION_URL_BASE",
    `${requireEnv("ENV_SUPABASE_URL")}/functions/v1/verify-email`,
  );
  return `${baseUrl}?token=${encodeURIComponent(token)}`;
}

export async function sendVerificationEmail(input: {
  userId: string;
  email: string;
  name?: string;
}) {
  const token = await createVerificationToken({
    userId: input.userId,
    email: input.email,
  });
  const verificationUrl = getVerificationUrl(token);
  const { subject, html } = getVerificationEmailTemplate({
    name: input.name,
    verificationUrl,
  });

  await sendMail({
    to: input.email,
    subject,
    html,
  });
}
