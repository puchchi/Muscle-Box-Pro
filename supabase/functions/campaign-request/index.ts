/// <reference path="../_shared/deno.d.ts" />
import { corsResponse, jsonResponse } from "../_shared/cors.ts";
import { getSupabaseAdmin } from "../_shared/supabase.ts";
import { sendMail } from "../_shared/email.ts";
import { optionalEnv } from "../../../lib/env.ts";
import { campaignRequestSchema } from "../_shared/validation/campaign.ts";
import { getCampaignRequestEmailTemplate } from "../../../shared/email/campaignRequest.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return corsResponse();
  if (req.method !== "POST") {
    return jsonResponse({ message: "Method not allowed" }, 405);
  }

  const parsed = campaignRequestSchema.safeParse(await req.json());
  if (!parsed.success) {
    return jsonResponse(
      { message: parsed.error.issues[0]?.message ?? "Invalid payload" },
      400,
    );
  }

  const values = parsed.data;
  const supabase = getSupabaseAdmin();

  const { error: dbError } = await supabase.from("campaign_requests").insert({
    brand_name: values.brandName,
    email: values.email,
    mobile: values.mobile,
  });

  if (dbError) {
    return jsonResponse(
      { message: `Unable to save campaign request: ${dbError.message}` },
      500,
    );
  }

  try {
    const { subject, html } = getCampaignRequestEmailTemplate({
      brandName: values.brandName,
      email: values.email,
      mobile: values.mobile,
    });

    await sendMail({
      to: values.email,
      cc: optionalEnv("CAMPAIGN_REQUEST_CC", "contact@muscleboxpro.com"),
      subject,
      html,
    });
  } catch (emailError) {
    console.error("Campaign request email failed:", emailError);
    return jsonResponse(
      {
        message:
          emailError instanceof Error
            ? `Campaign request saved, but email failed: ${emailError.message}`
            : "Campaign request saved, but email failed.",
      },
      500,
    );
  }

  return jsonResponse({
    message:
      "Thank you! Your campaign inquiry has been received. Our advertising team will contact you shortly.",
  });
});
