import { Router } from "express";
import { demoRequestSchema } from "@shared/auth";
import { getDemoRequestConfigErrors } from "../config/env";
import { sendDemoRequestEmail } from "../lib/email";

export const demoRouter = Router();

demoRouter.post("/request", async (req, res) => {
  const missingConfig = getDemoRequestConfigErrors();
  if (missingConfig.length > 0) {
    res.status(500).json({
      message: `Demo request email is not configured. Missing: ${missingConfig.join(", ")}`,
    });
    return;
  }

  const parsed = demoRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      message: parsed.error.issues[0]?.message ?? "Invalid payload",
    });
    return;
  }

  const values = parsed.data;
  try {
    await sendDemoRequestEmail({
      to: values.email,
      name: values.name,
      gymName: values.gymName,
      email: values.email,
      location: values.location,
      mobile: values.mobile,
      message: values.message,
    });
  } catch (error) {
    res.status(500).json({
      message:
        error instanceof Error
          ? `Unable to send demo email: ${error.message}`
          : "Unable to send demo email right now.",
    });
    return;
  }

  res.json({
    message:
      "Thanks for your interest. We have received your demo request and will contact you shortly.",
  });
});
