import { z } from "zod";

import { FRANCHISE_TIERS } from "../franchise/program";

/**
 * A franchise enquiry from the public /franchise page.
 *
 * Shared so the client and `POST /franchise/applications` validate the same shape. The
 * tier is constrained to the ids in `FRANCHISE_TIERS` rather than a free string: it
 * selects which set of commercials an application is evaluated against, and an
 * unrecognised value would be stored as a tier that does not exist.
 */
export const franchiseApplicationSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("A valid email is required"),
  mobile: z
    .string()
    .min(10, "A valid mobile number is required")
    .max(20, "That mobile number looks too long"),
  /** The city or region the applicant wants to develop. Not a MuscleBoxPro city list; a territory need not match one. */
  targetMarket: z.string().min(2, "Tell us which city or region you want to develop"),
  tier: z.enum(
    FRANCHISE_TIERS.map((t) => t.id) as [string, ...string[]],
    { errorMap: () => ({ message: "Choose a franchise tier" }) },
  ),
  company: z.string().max(120).optional(),
  /**
   * Free text, and deliberately not a set of investment bands. A band is the one field
   * in a franchise enquiry people decline to answer, and losing the lead costs more
   * than the tidier data is worth.
   */
  background: z.string().max(2000).optional(),
});

export type FranchiseApplicationInput = z.infer<typeof franchiseApplicationSchema>;
