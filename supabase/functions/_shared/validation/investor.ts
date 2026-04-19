// @ts-ignore Deno npm specifier resolved during Supabase function bundling.
import { z } from "npm:zod@3.25.76";

export const investorRequestSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("A valid email is required"),
  firm: z.string().max(200).optional(),
  investorType: z.string().max(100).optional(),
  message: z.string().max(2000).optional(),
});

export type InvestorRequestInput = z.infer<typeof investorRequestSchema>;
