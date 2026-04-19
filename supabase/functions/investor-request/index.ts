/// <reference path="../_shared/deno.d.ts" />
import { corsResponse, jsonResponse } from "../_shared/cors.ts";
import { getSupabaseAdmin } from "../_shared/supabase.ts";
import { sendMail } from "../_shared/email.ts";
import { optionalEnv } from "../../../lib/env.ts";
import { investorRequestSchema } from "../_shared/validation/investor.ts";
import { getInvestorRequestEmailTemplate } from "../../../shared/email/investorRequest.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return corsResponse();
  if (req.method !== "POST") {
    return jsonResponse({ message: "Method not allowed" }, 405);
  }

  const parsed = investorRequestSchema.safeParse(await req.json());
  if (!parsed.success) {
    return jsonResponse(
      { message: parsed.error.issues[0]?.message ?? "Invalid payload" },
      400,
    );
  }

  const values = parsed.data;
  const supabase = getSupabaseAdmin();

  const { error: dbError } = await supabase.from("investor_requests").insert({
    name: values.name,
    email: values.email,
    firm: values.firm ?? null,
    investor_type: values.investorType ?? null,
    message: values.message ?? null,
  });

  if (dbError) {
    return jsonResponse(
      { message: `Unable to save investor request: ${dbError.message}` },
      500,
    );
  }

  try {
    const { subject, html } = getInvestorRequestEmailTemplate({
      name: values.name,
      email: values.email,
      firm: values.firm,
      investorType: values.investorType,
      message: values.message,
    });

    await sendMail({
      to: values.email,
      cc: optionalEnv("INVESTOR_REQUEST_CC", "contact@muscleboxpro.com"),
      subject,
      html,
    });
  } catch (emailError) {
    console.error("Investor request email failed:", emailError);
    return jsonResponse(
      {
        message:
          emailError instanceof Error
            ? `Request saved, but confirmation email failed: ${emailError.message}`
            : "Request saved, but confirmation email failed.",
      },
      500,
    );
  }

  return jsonResponse({
    message:
      "Thank you for your interest. We have received your inquiry and will send the pitch deck within 24 hours.",
  });
});
