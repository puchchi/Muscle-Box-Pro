/// <reference path="../_shared/deno.d.ts" />
import { corsResponse, jsonResponse } from "../_shared/cors.ts";
import { getSupabaseAdmin } from "../_shared/supabase.ts";
import { getPasswordResetEmailTemplate } from "../../../emailTemplate.ts";
import { sendMail } from "../_shared/email.ts";
import { optionalEnv } from "../../../lib/env.ts";

function parseEmail(body: unknown): string {
  if (!body || typeof body !== "object") throw new Error("Invalid payload");
  const email = typeof (body as Record<string, unknown>).email === "string"
    ? (body as Record<string, string>).email.trim()
    : "";

  if (!email || !email.includes("@")) {
    throw new Error("A valid email is required");
  }

  return email;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return corsResponse();
  if (req.method !== "POST") {
    return jsonResponse({ message: "Method not allowed" }, 405);
  }

  let email: string;
  try {
    email = parseEmail(await req.json());
  } catch (error) {
    return jsonResponse(
      { message: error instanceof Error ? error.message : "Invalid payload" },
      400,
    );
  }

  const admin = getSupabaseAdmin();

  // Generate a Supabase password recovery link via admin API
  const redirectTo = optionalEnv(
    "PASSWORD_RESET_REDIRECT_URL",
    "https://www.muscleboxpro.com/forgot-password",
  );

  const { data, error } = await admin.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo },
  });

  if (error) {
    // Return generic message to avoid email enumeration
    return jsonResponse({
      message: "If an account exists for this email, a password reset link has been sent.",
    });
  }

  const resetUrl = data.properties?.action_link;
  if (!resetUrl) {
    return jsonResponse({ message: "Unable to generate reset link." }, 500);
  }

  const name = (data.user?.user_metadata?.full_name as string | undefined) ??
    (data.user?.user_metadata?.name as string | undefined);

  const { subject, html } = getPasswordResetEmailTemplate({ name, resetUrl });

  try {
    await sendMail({ to: email, subject, html });
  } catch (err) {
    return jsonResponse(
      {
        message: err instanceof Error
          ? `Unable to send reset email: ${err.message}`
          : "Unable to send reset email right now.",
      },
      500,
    );
  }

  return jsonResponse({
    message: "If an account exists for this email, a password reset link has been sent.",
  });
});
