// @ts-ignore Deno npm specifier resolved during Supabase function bundling.
import { z } from "npm:zod@3.25.76";

export const campaignRequestSchema = z.object({
  brandName: z.string().min(2, "Brand name is required"),
  email: z.string().email("A valid email is required"),
  mobile: z.string().min(10, "Valid mobile number is required"),
});

export type CampaignRequestInput = z.infer<typeof campaignRequestSchema>;
