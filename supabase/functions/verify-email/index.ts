/// <reference path="../_shared/deno.d.ts" />
import { corsHeaders, corsResponse, jsonResponse } from "../_shared/cors.ts";
import { optionalEnv } from "../../../lib/env.ts";
import { getSupabaseAdmin } from "../_shared/supabase.ts";
import { verifyVerificationToken } from "../_shared/verificationEmail.ts";

function redirectToLogin() {
  return optionalEnv(
    "EMAIL_VERIFICATION_REDIRECT_URL",
    `${optionalEnv("FRONTEND_URL", "http://localhost:5001")}/login?verified=1`,
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return corsResponse();
  if (req.method !== "GET") {
    return jsonResponse({ message: "Method not allowed" }, 405);
  }

  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  if (!token) {
    return jsonResponse({ message: "Missing verification token" }, 400);
  }

  try {
    const { payload } = await verifyVerificationToken(token);
    if (payload.type !== "email_verification") {
      return jsonResponse({ message: "Invalid verification token type" }, 400);
    }

    const userId = payload.sub;
    if (!userId) {
      return jsonResponse({ message: "Invalid verification token payload" }, 400);
    }

    const admin = getSupabaseAdmin();
    const { error } = await admin.auth.admin.updateUserById(userId, {
      email_confirm: true,
    });
    if (error) {
      return jsonResponse({ message: error.message }, 400);
    }

    return Response.redirect(redirectToLogin(), 302);
  } catch {
    return new Response("Verification token is invalid or expired", {
      status: 400,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  }
});
