import { Router } from "express";
import { campaignRequestSchema } from "@shared/auth";
import { getCampaignRequestConfigErrors } from "../config/env";
import { sendCampaignRequestEmail } from "../lib/email";
import { insertCampaignRequest } from "../lib/database";

export const campaignRouter = Router();

campaignRouter.post("/request", async (req, res) => {
  const missingConfig = getCampaignRequestConfigErrors();
  if (missingConfig.length > 0) {
    res.status(500).json({
      message: `Campaign request is not configured. Missing: ${missingConfig.join(", ")}`,
    });
    return;
  }

  const parsed = campaignRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      message: parsed.error.issues[0]?.message ?? "Invalid payload",
    });
    return;
  }

  const values = parsed.data;
  try {
    await insertCampaignRequest({
      brandName: values.brandName,
      email: values.email,
      mobile: values.mobile,
    });
  } catch (dbError) {
    res.status(500).json({
      message:
        dbError instanceof Error
          ? `Unable to save campaign request: ${dbError.message}`
          : "Unable to save campaign request right now.",
    });
    return;
  }

  try {
    await sendCampaignRequestEmail({
      to: values.email,
      brandName: values.brandName,
      email: values.email,
      mobile: values.mobile,
    });
  } catch (emailError) {
    res.status(500).json({
      message:
        emailError instanceof Error
          ? `Campaign request saved, but email failed: ${emailError.message}`
          : "Campaign request saved, but email failed.",
    });
    return;
  }

  res.json({
    message:
      "Thank you! Your campaign inquiry has been received. Our advertising team will contact you shortly.",
  });
});
