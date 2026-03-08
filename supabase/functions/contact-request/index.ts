/// <reference path="../_shared/deno.d.ts" />
import { corsResponse, jsonResponse } from "../_shared/cors.ts";
import { sendMail } from "../_shared/email.ts";
import { optionalEnv } from "../../../lib/env.ts";
import { contactRequestSchema } from "../_shared/validation/contact.ts";
import { getContactRequestEmailTemplate } from "../../../shared/email/contactRequest.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return corsResponse();
  if (req.method !== "POST") {
    return jsonResponse({ message: "Method not allowed" }, 405);
  }

  const parsed = contactRequestSchema.safeParse(await req.json());
  if (!parsed.success) {
    return jsonResponse(
      { message: parsed.error.issues[0]?.message ?? "Invalid payload" },
      400,
    );
  }

  const values = parsed.data;

  try {
    const { subject, html } = getContactRequestEmailTemplate({
      name: values.name,
      email: values.email,
      message: values.message,
    });

    await sendMail({
      to: values.email,
      cc: optionalEnv("CONTACT_REQUEST_CC", "contact@muscleboxpro.com"),
      subject,
      html,
    });
  } catch (emailError) {
    console.error("Contact request email failed:", emailError);
    return jsonResponse(
      {
        message:
          emailError instanceof Error
            ? `Unable to send contact email: ${emailError.message}`
            : "Unable to send contact email right now.",
      },
      500,
    );
  }

  return jsonResponse({
    message:
      "Thanks for reaching out. We have received your message and will contact you shortly.",
  });
});
