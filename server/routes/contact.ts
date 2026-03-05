import { Router } from "express";
import { contactRequestSchema } from "@shared/auth";
import { getContactRequestConfigErrors } from "../config/env";
import { sendContactRequestEmail } from "../lib/email";

export const contactRouter = Router();

contactRouter.post("/request", async (req, res) => {
  const missingConfig = getContactRequestConfigErrors();
  if (missingConfig.length > 0) {
    res.status(500).json({
      message: `Contact request email is not configured. Missing: ${missingConfig.join(", ")}`,
    });
    return;
  }

  const parsed = contactRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      message: parsed.error.issues[0]?.message ?? "Invalid payload",
    });
    return;
  }

  const values = parsed.data;
  try {
    await sendContactRequestEmail({
      to: values.email,
      name: values.name,
      email: values.email,
      message: values.message,
    });
  } catch (emailError) {
    res.status(500).json({
      message:
        emailError instanceof Error
          ? `Unable to send contact email: ${emailError.message}`
          : "Unable to send contact email right now.",
    });
    return;
  }

  res.json({
    message:
      "Thanks for reaching out. We have received your message and will contact you shortly.",
  });
});
