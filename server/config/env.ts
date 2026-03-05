import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.string().default("5000"),
  FRONTEND_URL: z.string().url().default("http://localhost:5001"),
  FRONTEND_URLS: z.string().optional(),
  BACKEND_PUBLIC_URL: z.string().url().optional(),
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1, "SUPABASE_ANON_KEY is required"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  SUPABASE_JWT_AUDIENCE: z.string().default("authenticated"),
  EMAIL_VERIFICATION_SECRET: z.string().optional(),
  EMAIL_VERIFICATION_TTL_MINUTES: z.string().default("60"),
  PASSWORD_RESET_SECRET: z.string().optional(),
  PASSWORD_RESET_TTL_MINUTES: z.string().default("30"),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().default("587"),
  SMTP_SECURE: z
    .string()
    .optional()
    .transform((value) => value === "true"),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),
  DEMO_REQUEST_CC: z.string().email().default("contact@muscleboxpro.com"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const errors = parsed.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("; ");
  throw new Error(`Invalid environment configuration: ${errors}`);
}

export const env = parsed.data;

export function getAllowedOrigins() {
  const origins = new Set<string>([env.FRONTEND_URL]);

  if (env.FRONTEND_URLS) {
    for (const raw of env.FRONTEND_URLS.split(",")) {
      const origin = raw.trim();
      if (origin) {
        origins.add(origin);
      }
    }
  }

  if (env.NODE_ENV === "development") {
    origins.add("http://localhost:5000");
    origins.add("http://localhost:5001");
    origins.add("http://localhost:5002");
    origins.add("http://localhost:5173");
    origins.add("http://127.0.0.1:5000");
    origins.add("http://127.0.0.1:5001");
    origins.add("http://127.0.0.1:5002");
    origins.add("http://127.0.0.1:5173");
  }

  return origins;
}

export function getBackendPublicUrl() {
  return env.BACKEND_PUBLIC_URL ?? `http://localhost:${env.PORT}`;
}

export function getCustomEmailConfigErrors() {
  const missing: string[] = [];

  if (!env.SUPABASE_SERVICE_ROLE_KEY) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  if (!env.EMAIL_VERIFICATION_SECRET) missing.push("EMAIL_VERIFICATION_SECRET");
  if (!env.SMTP_HOST) missing.push("SMTP_HOST");
  if (!env.SMTP_USER) missing.push("SMTP_USER");
  if (!env.SMTP_PASS) missing.push("SMTP_PASS");
  if (!env.SMTP_FROM) missing.push("SMTP_FROM");

  return missing;
}

export function getPasswordResetConfigErrors() {
  const missing: string[] = [];

  if (!env.SUPABASE_SERVICE_ROLE_KEY) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  if (!env.PASSWORD_RESET_SECRET) missing.push("PASSWORD_RESET_SECRET");
  if (!env.SMTP_HOST) missing.push("SMTP_HOST");
  if (!env.SMTP_USER) missing.push("SMTP_USER");
  if (!env.SMTP_PASS) missing.push("SMTP_PASS");
  if (!env.SMTP_FROM) missing.push("SMTP_FROM");

  return missing;
}

export function getDemoRequestConfigErrors() {
  const missing: string[] = [];
  if (!env.SMTP_HOST) missing.push("SMTP_HOST");
  if (!env.SMTP_USER) missing.push("SMTP_USER");
  if (!env.SMTP_PASS) missing.push("SMTP_PASS");
  if (!env.SMTP_FROM) missing.push("SMTP_FROM");
  return missing;
}
