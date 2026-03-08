import { corsHeaders, corsResponse, jsonResponse } from "../_shared/cors.ts";
import { getSupabaseAdmin } from "../../../lib/supabase.ts";
import { getResend } from "../../../lib/resend.ts";
import { optionalEnv } from "../../../lib/env.ts";
import { demoRequestSchema } from "../../../shared/validation/demo.ts";
import { getDemoRequestEmailTemplate } from "../../../shared/email/demoRequest.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return corsResponse();
  if (req.method !== "POST") {
    return jsonResponse({ message: "Method not allowed" }, 405);
  }

  const parsed = demoRequestSchema.safeParse(await req.json());
  if (!parsed.success) {
    return jsonResponse(
      { message: parsed.error.issues[0]?.message ?? "Invalid payload" },
      400,
    );
  }

  const values = parsed.data;
  const supabase = getSupabaseAdmin();

  const { error: dbError } = await supabase.from("demo_requests").insert({
    name: values.name,
    gym_name: values.gymName,
    email: values.email,
    mobile: values.mobile,
    location: values.location,
    message: values.message ?? null,
  });

  if (dbError) {
    return jsonResponse(
      { message: `Unable to save demo request: ${dbError.message}` },
      500,
    );
  }

  try {
    const resend = getResend();
    const { subject, html } = getDemoRequestEmailTemplate({
      name: values.name,
      gymName: values.gymName,
      email: values.email,
      mobile: values.mobile,
      location: values.location,
      message: values.message,
    });

    const ccAddress = optionalEnv("DEMO_REQUEST_CC", "contact@muscleboxpro.com");
    const fromAddress = optionalEnv("EMAIL_FROM", "Muscle Box Pro <no-reply@muscleboxpro.com>");

    await resend.emails.send({
      from: fromAddress,
      to: values.email,
      cc: ccAddress,
      subject,
      html,
    });
  } catch (emailError) {
    console.error("Demo request email failed:", emailError);
    return jsonResponse(
      {
        message:
          emailError instanceof Error
            ? `Unable to send demo email: ${emailError.message}`
            : "Unable to send demo email right now.",
      },
      500,
    );
  }

  return jsonResponse({
    message:
      "Thanks for your interest. We have received your demo request and will contact you shortly.",
  });
});
