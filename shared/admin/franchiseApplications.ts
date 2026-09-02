/**
 * The franchise enquiry backlog, and the one decision an admin records against a row.
 *
 * These are the two routes on `MbpFranchiseAdmin` that had no client: `GET /admin/franchise-applications`
 * and `PATCH /admin/franchise-applications/{applicationId}`. They are the front half of the invite
 * workflow — an enquiry from `/franchise` is triaged here and then converted by
 * `POST /admin/franchises` with its `applicationId` as `sourceApplicationId`.
 *
 * ## `new` is the absence of a row, and `converted` cannot be written
 *
 * `repo/franchiseTriage.ts` stores nothing for `new`, because every enquiry that arrived before this
 * queue existed looks like that and backfilling a row each to make the list render would be a
 * migration in service of a display. `converted` is terminal and is set by creating a franchise, so
 * `validateTriageDecision` refuses it here with a message saying as much. Hence two lists: what a row
 * may *be* and what an admin may *write*.
 *
 * ## `tier` is a string, not an enum
 *
 * The figures on an application are what the applicant was quoted at submission time, and the tier
 * table can change under them. `franchiseTier(...)?.name ?? null` on the server is explicit about
 * that, so a row can carry a tier id no longer in `FRANCHISE_TIERS`. An enum here would fail the
 * whole list over one historical row; `tierName` is the display value and `null` is its honest answer.
 */

import * as z from "zod";

export const FRANCHISE_TRIAGE_STATUSES = ["new", "reviewed", "rejected", "converted"] as const;
export type FranchiseTriageStatus = (typeof FRANCHISE_TRIAGE_STATUSES)[number];

/** The two `validateTriageDecision` accepts. See the header on why `converted` is not among them. */
export const FRANCHISE_TRIAGE_DECISIONS = ["reviewed", "rejected"] as const;
export type FranchiseTriageDecision = (typeof FRANCHISE_TRIAGE_DECISIONS)[number];

/** `MAX.note` in `domain/franchise/adminInput.ts`. */
export const MAX_TRIAGE_NOTE = 2000;

/** Enough to say what was concluded. Ours only: this length is not enforced server-side. */
export const MIN_TRIAGE_REJECTION_NOTE = 10;

export type FranchiseApplicationTriage = {
  note: string;
  decidedByEmail: string;
  decidedAt: string;
  /** Set once a franchise has been created from this application, which makes the row terminal. */
  franchiseId: string | null;
};

export type FranchiseApplicationRow = {
  applicationId: string;
  /** `MBP-FR-…`, the string the applicant was emailed. */
  reference: string;
  name: string;
  email: string;
  mobile: string;
  targetMarket: string;
  tier: string;
  tierName: string | null;
  investmentPaise: number;
  initialMachines: number;
  company?: string;
  background?: string;
  createdAt: string;
  status: FranchiseTriageStatus;
  triage: FranchiseApplicationTriage | null;
};

export type FranchiseApplicationPage = {
  /** The server's own list, which the panel draws its filter chips from. */
  statuses: FranchiseTriageStatus[];
  applications: FranchiseApplicationRow[];
  scanned: number;
  /**
   * The enquiry table is keyed by the applicant's email, so the list handler reads a bounded slab and
   * joins in memory. `true` means the backlog has outgrown that slab and the oldest rows are no
   * longer in the answer. It is a fact worth showing rather than a metric worth hiding.
   */
  capped: boolean;
};

export const franchiseTriageFormSchema = z
  .object({
    status: z.enum(FRANCHISE_TRIAGE_DECISIONS, {
      errorMap: () => ({ message: "Choose reviewed or rejected." }),
    }),
    note: z.string().trim().max(MAX_TRIAGE_NOTE, `At most ${MAX_TRIAGE_NOTE} characters.`),
  })
  .superRefine((form, ctx) => {
    // Required on a rejection and optional on a review, which is stricter than the route on one of
    // the two. Nobody is told they were rejected, so this note is the only surviving record of why,
    // and it is what the next person reads when the same applicant enquires again.
    if (form.status === "rejected" && form.note.length < MIN_TRIAGE_REJECTION_NOTE) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["note"],
        message: `Say why, in at least ${MIN_TRIAGE_REJECTION_NOTE} characters. Nobody is told they were rejected, so this is the only record.`,
      });
    }
  });

export type FranchiseTriageForm = z.output<typeof franchiseTriageFormSchema>;

/** The wire shape, which is the form's shape. Kept as a function so the two can diverge. */
export type FranchiseTriageBody = { status: FranchiseTriageDecision; note: string };

export function toFranchiseTriageBody(form: FranchiseTriageForm): FranchiseTriageBody {
  return { status: form.status, note: form.note };
}

/** What the PATCH answers with. Flat, and the panel refetches rather than patching a row from it. */
export type FranchiseTriageResult = {
  applicationId: string;
  reference: string;
  status: FranchiseTriageDecision;
  note: string;
  decidedByEmail: string;
  decidedAt: string;
};
