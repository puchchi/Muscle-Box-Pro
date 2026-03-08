/// <reference path="../_shared/deno.d.ts" />
import { corsResponse, jsonResponse } from "../_shared/cors.ts";
import { getSupabaseAdmin } from "../_shared/supabase.ts";
import { sendVerificationEmail } from "../_shared/verificationEmail.ts";

type SignupBody = {
  name: string;
  email: string;
  password: string;
  mobile?: string;
};

function parseSignupBody(body: unknown): SignupBody {
  if (!body || typeof body !== "object") {
    throw new Error("Invalid payload");
  }

  const payload = body as Record<string, unknown>;
  const name = typeof payload.name === "string" ? payload.name.trim() : "";
  const email = typeof payload.email === "string" ? payload.email.trim() : "";
  const password = typeof payload.password === "string" ? payload.password : "";
  const mobile =
    typeof payload.mobile === "string" && payload.mobile.trim()
      ? payload.mobile.trim()
      : undefined;

  if (name.length < 2) throw new Error("Name is required");
  if (!email || !email.includes("@")) throw new Error("A valid email is required");
  if (password.length < 6) throw new Error("Password must be at least 6 characters");
  if (mobile && mobile.length < 10) {
    throw new Error("Valid mobile number is required");
  }

  return { name, email, password, mobile };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return corsResponse();
  if (req.method !== "POST") {
    return jsonResponse({ message: "Method not allowed" }, 405);
  }

  let body: SignupBody;
  try {
    body = parseSignupBody(await req.json());
  } catch (error) {
    return jsonResponse(
      { message: error instanceof Error ? error.message : "Invalid payload" },
      400,
    );
  }

  const admin = getSupabaseAdmin();
  const { data, error } = await admin.auth.admin.createUser({
    email: body.email,
    password: body.password,
    email_confirm: false,
    user_metadata: {
      full_name: body.name,
      mobile: body.mobile,
      account_type: "user",
    },
  });

  if (error) {
    return jsonResponse({ message: error.message }, 400);
  }

  const user = data.user;
  if (!user) {
    return jsonResponse({ message: "Unable to create user." }, 500);
  }

  try {
    await sendVerificationEmail({
      userId: user.id,
      email: body.email,
      name: body.name,
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

  return jsonResponse(
    {
      message: "Verification link has been sent, please click on then login.",
      user: { id: user.id, email: user.email },
    },
    201,
  );
});
