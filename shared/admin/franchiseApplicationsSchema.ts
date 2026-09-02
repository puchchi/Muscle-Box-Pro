/**
 * Runtime validation of `GET /admin/franchise-applications`.
 *
 * `franchisesSchema.ts`'s reason for existing applies here with one extra turn of the screw: this list
 * is a **join across two tables**, the enquiries in `mbp-franchise-<env>` and the triage rows in
 * `mbp-franchises-<env>`, assembled field by field in the handler. A rename on either side arrives as
 * a missing key rather than as an error, and a missing `applicationId` is a React key collision that
 * renders the wrong row's triage against the wrong applicant.
 *
 * `applicationId` and `email` are the two required to be non-empty, for `leadsSchema.ts`'s reasons: one
 * is the key, the other is the only field the screen exists to hand back to a person.
 */

import * as z from "zod";
import { toParse, type AdminParse } from "./parse";
import {
  FRANCHISE_TRIAGE_STATUSES,
  type FranchiseApplicationPage,
} from "./franchiseApplications";

const triageStatus = z.enum(FRANCHISE_TRIAGE_STATUSES);

const triage = z.object({
  note: z.string(),
  decidedByEmail: z.string(),
  decidedAt: z.string(),
  franchiseId: z.string().nullable(),
});

const application = z.object({
  applicationId: z.string().min(1),
  reference: z.string(),
  name: z.string(),
  email: z.string().min(1),
  mobile: z.string(),
  targetMarket: z.string(),
  /** Not an enum. See the header of `franchiseApplications.ts`. */
  tier: z.string(),
  tierName: z.string().nullable(),
  investmentPaise: z.number().int().min(0),
  initialMachines: z.number().int().min(0),
  /**
   * Optional rather than nullable, because both are optional on `franchiseApplicationSchema` and an
   * absent value was never written to DynamoDB. The attribute is missing, so the key is missing.
   */
  company: z.string().optional(),
  background: z.string().optional(),
  /** `formatIstDateTime` renders an unparseable value as itself, so no format assertion. */
  createdAt: z.string(),
  status: triageStatus,
  triage: triage.nullable(),
});

export const franchiseApplicationPageSchema = z.object({
  statuses: z.array(triageStatus).min(1),
  applications: z.array(application),
  scanned: z.number().int().min(0),
  capped: z.boolean(),
});

export const _franchiseApplicationPageTypeCheck =
  franchiseApplicationPageSchema satisfies z.ZodType<FranchiseApplicationPage>;

export function parseFranchiseApplicationPage(
  value: unknown,
): AdminParse<FranchiseApplicationPage> {
  return toParse(franchiseApplicationPageSchema.safeParse(value));
}
