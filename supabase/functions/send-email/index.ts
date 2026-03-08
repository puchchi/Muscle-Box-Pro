import { createClient } from "@supabase/supabase-js";
import { corsResponse, jsonResponse } from "../_shared/cors.ts";
import { getResend } from "../../../lib/resend.ts";
import { requireEnv, optionalEnv } from "../../../lib/env.ts";

const emailPayloadSchema = {
  parse(body: unknown) {
    if (!body || typeof body !== "object") throw new Error("Invalid payload");
    const b = body as Record<string, unknown>;
    if (typeof b.to !== "string" || !b.to) throw new Error("to is required");
    if (typeof b.subject !== "string" || !b.subject)
      throw new Error("subject is required");
    if (typeof b.html !== "string" || !b.html)
      throw new Error("html is required");
    return {
      to: b.to,
      subject: b.subject,
      html: b.html,
      cc: typeof b.cc === "string" ? b.cc : undefined,
    };
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return corsResponse();
  if (req.method !== "POST") {
    return jsonResponse({ message: "Method not allowed" }, 405);
  }

  const authHeader = req.headers.get("authorization");
  if (!authHeader) {
    return jsonResponse({ message: "Missing authorization header" }, 401);
  }

  try {
    const supabase = createClient(
      requireEnv("SUPABASE_URL"),
      requireEnv("SUPABASE_ANON_KEY"),
      {
        global: { headers: { Authorization: authHeader } },
        auth: { autoRefreshToken: false, persistSession: false },
      },
    );
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      return jsonResponse({ message: "Unauthorized" }, 401);
    }
  } catch {
    return jsonResponse({ message: "Unauthorized" }, 401);
  }

  let payload;
  try {
    payload = emailPayloadSchema.parse(await req.json());
  } catch (parseError) {
    return jsonResponse(
      {
        message:
          parseError instanceof Error
            ? parseError.message
            : "Invalid email payload",
      },
      400,
    );
  }

  try {
    const resend = getResend();
    const fromAddress = optionalEnv(
      "EMAIL_FROM",
      "Muscle Box Pro <no-reply@muscleboxpro.com>",
    );
    await resend.emails.send({
      from: fromAddress,
      to: payload.to,
      cc: payload.cc,
      subject: payload.subject,
      html: payload.html,
    });
  } catch (emailError) {
    console.error("send-email failed:", emailError);
    return jsonResponse(
      {
        message:
          emailError instanceof Error
            ? emailError.message
            : "Unable to send email",
      },
      500,
    );
  }

  return jsonResponse({ message: "Email sent" });
});
