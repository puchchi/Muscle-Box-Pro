/// <reference path="../_shared/deno.d.ts" />
import { corsResponse, jsonResponse } from "../_shared/cors.ts";
import { getSupabaseAdmin } from "../_shared/supabase.ts";
import { sendVerificationEmail } from "../_shared/verificationEmail.ts";

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
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) {
    return jsonResponse({ message: "Unable to process verification request." }, 500);
  }

  const user = data.users.find((entry) =>
    (entry.email ?? "").toLowerCase() === email.toLowerCase()
  );

  if (!user) {
    return jsonResponse({
      message: "If your account exists, a verification link has been sent.",
    });
  }

  if (user.email_confirmed_at) {
    return jsonResponse({ message: "Email is already verified. Please login." }, 400);
  }

  try {
    await sendVerificationEmail({
      userId: user.id,
      email: user.email ?? email,
      name: (user.user_metadata?.full_name as string | undefined) ??
        (user.user_metadata?.name as string | undefined),
    });
  } catch (error) {
    return jsonResponse(
      {
        message:
          error instanceof Error
            ? `Unable to send verification email: ${error.message}`
            : "Unable to send verification email right now.",
      },
      500,
    );
  }

  return jsonResponse({
    message: "Verification link has been sent, please click on then login.",
  });
});
