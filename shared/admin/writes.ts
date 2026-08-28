/**
 * What the admin panel *sends*: the six write bodies, and the forms behind them.
 *
 * `gyms.ts` describes the two reads. This describes `PATCH …/terms`, `PUT …/machine` and the four
 * `…/offboarding/*` routes, mirroring `domain/adminInput.ts` in `mbp-backend` — `validateTermsPatch`,
 * `validateMachinePut`, `validateNoticeInput`, `validateTerminationInput`,
 * `validateMachineRecoveredInput` and `validateSettlementInput`.
 *
 * ## Why a client-side copy of server validation exists at all
 *
 * It is not to spare the server the work. It is because these forms are long and the server
 * answers a malformed one with `fieldErrors` — a round trip per typo on a settlement with six
 * deduction lines. The division of labour is the same one `adminInviteFormSchema` already draws:
 * **this side refuses what is obviously malformed, the server decides everything that depends on
 * state it holds.** So the bounds and the shapes are here, and none of these:
 *
 * - whether the gym has signed (terms are refused once it has — a `ConditionCheck`, not an `if`)
 * - whether a `deviceNo` names this gym's unit, another gym's, or nothing
 * - whether §37.6 permits a `retrieval_costs` line, which turns on the cause *and* on whether a
 *   notice was served
 * - whether the term has actually expired, for `term_expiry`
 * - how much deposit we hold, which comes from what the gateway told us it captured
 *
 * Each of those is a database question. Guessing at them here would produce a form that refuses
 * something the server would have allowed, which is worse than a round trip.
 *
 * ## Two conventions carried from the wire
 *
 * **Rupees out, whole ones only.** Every amount is named `…Inr` and every one is an integer:
 * `domain/money.ts` refuses a fractional rupee outright rather than storing one, so a form that
 * accepted ₹50,000.50 would be offering a value the server will reject.
 *
 * **Dates out as calendar dates, not instants.** `receivedOn` and `recoveredOn` are `YYYY-MM-DD`
 * because they record events on a dated letter or a dated collection note, and the server turns
 * them into instants at 00:00 **IST** (`istDayStart`). Sending an instant would hand the server a
 * timezone decision it has already made, in the wrong direction.
 */

import * as z from "zod";
import type { DeductionKind, TerminationCause } from "./gyms";

/** Both the server's ceiling (`MAX_AMOUNT_INR`) and, restated, the reason to have one: digit slips. */
const MAX_AMOUNT_INR = 100_000_000;

/** `MIN_REASON_LENGTH` / `MAX_REASON_LENGTH` in `domain/offboarding.ts`. */
export const MIN_REASON_LENGTH = 10;
export const MAX_REASON_LENGTH = 500;

/**
 * A whole number of rupees.
 *
 * `z.coerce` is deliberately not used. A number input hands back `NaN` for a cleared field, and
 * coercion would turn that into a validation message about a number when the honest one is
 * "required" — so the form fields keep `undefined` for empty and this refuses `NaN` as not a
 * number at all.
 */
const inr = z
  .number({ invalid_type_error: "Enter a number." })
  .int("Whole rupees only.")
  .min(0, "Cannot be negative.")
  .max(MAX_AMOUNT_INR, "Larger than any figure this should be. Check the digits.");

const percent = z
  .number({ invalid_type_error: "Enter a number." })
  .int("Whole percent only.")
  .min(0)
  .max(100, "A share cannot exceed 100%.");

const months = (max: number) =>
  z.number({ invalid_type_error: "Enter a number." }).int().min(1).max(max);

/**
 * A calendar date that is not in the future.
 *
 * The future check is here rather than left to the server because it is the one bound that needs
 * no database: every offboarding date records something that has already happened, so a future one
 * is a typo — and a typo that moves a contractual clock. The server's *other* bound, "more than
 * 365 days ago, check the year", is also cheap and is included for the same reason.
 *
 * `2026-02-31` is refused. It matches the pattern and `new Date` silently reads it as 3 March,
 * which on a field that starts §36.1's thirty days is a date nobody agreed to.
 */
const pastCalendarDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use the date picker, or type YYYY-MM-DD.")
  .refine((value) => {
    const [year, month, day] = value.split("-").map(Number);
    const parsed = new Date(`${value}T00:00:00Z`);
    return (
      parsed.getUTCFullYear() === year &&
      parsed.getUTCMonth() + 1 === month &&
      parsed.getUTCDate() === day
    );
  }, "Not a real date.")
  .refine((value) => value <= todayInIst(), "Cannot be in the future.")
  .refine((value) => {
    const at = Date.parse(`${value}T00:00:00Z`);
    return Date.now() - at <= 366 * 86_400_000;
  }, "More than a year ago. Check the year.");

/**
 * Today's date in IST, as `YYYY-MM-DD`.
 *
 * IST rather than the browser's zone, so the boundary this form enforces is the same one
 * `istDayStart` enforces server-side. An admin in India filling this in at 02:00 would otherwise
 * be told that today is tomorrow.
 */
export function todayInIst(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

// ── PATCH /admin/gyms/{gymId}/terms ─────────────────────────────────────────

/**
 * The editable commercial terms.
 *
 * Every field is required *on this form* even though the route is a `PATCH` that accepts any
 * subset. The form is prefilled from the gym's current terms and submits only what changed
 * (`termsDiff`), so a blank here means the admin cleared a figure rather than left it alone — and
 * an empty deposit silently omitted from the patch is an edit that appears to have worked.
 *
 * The one field that is not a plain number is `earlyTerminationChargeInr`, for the reason
 * `OnboardingTerms` gives at length: null means "genuinely unagreed" and zero means "nil on 30
 * days' notice", and they are different answers. A three-way control, not a number box.
 */
export const adminTermsFormSchema = z.object({
  securityDepositInr: inr,
  termMonths: months(600),
  gymSharePctBeforeMilestone: percent,
  gymSharePctAfterMilestone: percent,
  milestoneCups: z.number({ invalid_type_error: "Enter a number." }).int().min(0).max(10_000_000),
  milestoneNetProfitInr: inr,
  advertisingGymSharePct: percent,
  electricityInrPerBlock: inr,
  electricityCupsPerBlock: z.number({ invalid_type_error: "Enter a number." }).int().min(1).max(1_000_000),
  electricityReviewWindowMonths: months(120),
  settlementDaysAfterMonthEnd: z.number({ invalid_type_error: "Enter a number." }).int().min(1).max(90),
  earlyTerminationChargeInr: inr.nullable(),
});

export type AdminTermsForm = z.infer<typeof adminTermsFormSchema>;

/** The wire body. Every key optional, because the route patches. */
export type AdminTermsPatchBody = Partial<AdminTermsForm>;

export type AdminTermsPatchResult = {
  gymId: string;
  securityDepositInr: number;
  updatedAt: string;
  updatedByEmail: string;
  /** Which keys the server actually applied. Echoed so the panel confirms the edit, not the intent. */
  changed: string[];
};

/**
 * Only what changed, or null if nothing did.
 *
 * Null rather than `{}` because the server refuses an empty patch — *"Nothing to change — send at
 * least one term"* — and that refusal reaching an admin who pressed Save on an untouched form is a
 * confusing way to say "there was nothing to save". The caller can say the true thing instead.
 *
 * `Object.keys(before)` drives the walk rather than `after`, so a field this schema stops
 * describing disappears from the patch instead of travelling as `undefined`.
 */
export function termsDiff(
  before: AdminTermsForm,
  after: AdminTermsForm,
): AdminTermsPatchBody | null {
  const patch: Record<string, unknown> = {};
  for (const key of Object.keys(before) as Array<keyof AdminTermsForm>) {
    if (after[key] !== before[key]) patch[key] = after[key];
  }
  return Object.keys(patch).length === 0 ? null : (patch as AdminTermsPatchBody);
}

// ── PUT /admin/gyms/{gymId}/machine ─────────────────────────────────────────

/**
 * The device number's shape, which is checked rather than merely required.
 *
 * `deviceNo` is the join key to the payments service through `gsi1-device`. A stray space produces
 * a machine row that no payment ever matches, and the symptom surfaces months later as a gym with
 * no revenue — so this is the one text field on the admin surface whose *characters* matter.
 */
const deviceNo = z
  .string()
  .min(1, "Required.")
  .max(64, "At most 64 characters.")
  .regex(/^[A-Za-z0-9_-]+$/, "Letters, digits, hyphen and underscore only.");

export const MACHINE_STATUSES = ["allocated", "installed", "servicing", "replaced", "removed"] as const;

/**
 * Assign, patch or replace the unit — one form over a route with two behaviours.
 *
 * The route decides between patch and replace by reading the current row: a `deviceNo` the gym
 * already holds is a patch, a different one is a replacement (a new sort key, hence a new item,
 * hence a transaction that marks the old row `replaced` rather than deleting it). This form
 * therefore always sends a **whole machine**, because a body naming an unknown `deviceNo` with
 * only three fields filled is refused server-side as a typo rather than treated as an assignment.
 *
 * That is also why `model` and `valueInr` are required here even when the admin only means to set
 * an installation date: the same submission has to be a valid replacement if the device number
 * turns out to be new.
 */
export const adminMachineFormSchema = z.object({
  deviceNo,
  model: z.string().min(1, "Required.").max(120, "At most 120 characters."),
  serialNumber: z.string().max(120, "At most 120 characters."),
  valueInr: inr,
  accessories: z.string().max(2000, "At most 2000 characters."),
  /**
   * The start of the contractual term (§4.1), so it is validated as a real date and allowed to be
   * unset. Not `pastCalendarDate`: an installation can legitimately be booked for next Tuesday,
   * and the server does not bound this one the way it bounds the offboarding dates.
   */
  installationDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use the date picker, or type YYYY-MM-DD.")
    .or(z.literal("")),
  status: z.enum(MACHINE_STATUSES),
});

export type AdminMachineForm = z.infer<typeof adminMachineFormSchema>;

export type AdminMachinePutBody = {
  deviceNo: string;
  model: string;
  serialNumber: string | null;
  valueInr: number;
  accessories: string;
  installationDate: string | null;
  status: (typeof MACHINE_STATUSES)[number];
};

/**
 * Form values → wire body.
 *
 * The two empty-string translations are the whole content of this function, and they are not
 * cosmetic. `serialNumber: ""` would fail the server's `text(..., required: false)` path and land
 * as `null` anyway; sending `null` outright says "there is no serial number" rather than "the box
 * was empty". `installationDate: ""` must become `null` for the same reason with more at stake —
 * `isoDate` reads `""` as malformed and answers a field error, so an admin clearing a wrongly
 * entered installation date would be told to use the date picker instead of having it cleared.
 */
export function toAdminMachineBody(form: AdminMachineForm): AdminMachinePutBody {
  return {
    deviceNo: form.deviceNo.trim(),
    model: form.model.trim(),
    serialNumber: form.serialNumber.trim() === "" ? null : form.serialNumber.trim(),
    valueInr: form.valueInr,
    accessories: form.accessories.trim(),
    installationDate: form.installationDate === "" ? null : form.installationDate,
    status: form.status,
  };
}

export type AdminMachinePutResult = {
  gymId: string;
  deviceNo: string;
  /** Which of the route's two behaviours happened. The server knows; the panel should say. */
  replaced?: boolean;
};

// ── POST /admin/gyms/{gymId}/offboarding/notice ──────────────────────────────

/**
 * A §36.1 notice, as received.
 *
 * `channel` is free text, not a select, because §41's notices clause does not close the set — and
 * an enumeration would force "a letter handed to the technician on site" into `other`, recording
 * less than the sentence does. The panel offers suggestions rather than options.
 */
export const adminNoticeFormSchema = z.object({
  receivedOn: pastCalendarDate,
  channel: z.string().min(1, "Required.").max(120, "At most 120 characters."),
});

export type AdminNoticeForm = z.infer<typeof adminNoticeFormSchema>;

// ── POST /admin/gyms/{gymId}/offboarding/terminate ───────────────────────────

export const TERMINATION_CAUSES = ["gym_notice", "gym_breach", "mutual", "term_expiry"] as const;

/**
 * End the agreement.
 *
 * **The reason's minimum length is not enforced here, and that is deliberate.** Whether a reason
 * is required at all depends on the cause *and* on whether a served notice is being cut short —
 * `classifyTermination`'s decision, over §35 and §36.2. Duplicating it would create two places
 * that have to agree about the document, and the client's copy would be the one that goes stale.
 * `terminationNeedsReason` below is a *hint* for the form's helper text, not a gate.
 */
export const adminTerminateFormSchema = z.object({
  /**
   * The `errorMap` is here because the form's select starts on a blank option rather than on a
   * default cause: picking the wrong cause changes what may be deducted from money we are holding,
   * so there is no cause safe enough to preselect. A blank submission is `invalid_enum_value`, whose
   * stock message lists all four wire values at the admin.
   */
  cause: z.enum(TERMINATION_CAUSES, { errorMap: () => ({ message: "Choose a cause." }) }),
  reason: z.string().max(MAX_REASON_LENGTH, `At most ${MAX_REASON_LENGTH} characters.`),
});

export type AdminTerminateForm = z.infer<typeof adminTerminateFormSchema>;

export type AdminTerminateBody = { cause: TerminationCause; reason: string | null };

export function toAdminTerminateBody(form: AdminTerminateForm): AdminTerminateBody {
  return {
    cause: form.cause,
    reason: form.reason.trim() === "" ? null : form.reason.trim(),
  };
}

/**
 * Whether the server will insist on a reason — the form's hint, not its validation.
 *
 * Mirrors two of `classifyTermination`'s branches: a breach names a §35 ground, and cutting a
 * served notice short is §36.2's "removal required without the notice" and needs explaining. It
 * is a hint because the second branch depends on `now` against a stored `effectiveAt`, and a
 * client clock is not the one that decides.
 */
export function terminationNeedsReason(input: {
  cause: TerminationCause;
  noticeEffectiveAt: string | null;
}): boolean {
  if (input.cause === "gym_breach") return true;
  if (input.cause !== "gym_notice") return false;
  if (input.noticeEffectiveAt === null) return false;
  return Date.now() < Date.parse(input.noticeEffectiveAt);
}

// ── POST /admin/gyms/{gymId}/offboarding/machine-recovered ───────────────────

export const adminRecoveredFormSchema = z.object({
  deviceNo,
  recoveredOn: pastCalendarDate,
  /**
   * No minimum length, matching the server. "Good" is four characters and is a complete answer;
   * the note that needs a sentence is the one attached to a deduction, where it justifies taking
   * money.
   */
  condition: z.string().min(1, "Required.").max(MAX_REASON_LENGTH, `At most ${MAX_REASON_LENGTH} characters.`),
});

export type AdminRecoveredForm = z.infer<typeof adminRecoveredFormSchema>;

// ── POST /admin/gyms/{gymId}/offboarding/settlement ──────────────────────────

export const DEDUCTION_KINDS = ["outstanding_dues", "retrieval_costs", "damage", "other"] as const;

/** ₹10,00,000 a line — the server's `MAX_DEDUCTION_INR`. A digit-slip guard, not a policy limit. */
const MAX_DEDUCTION_INR = 1_000_000;

/**
 * One deduction line.
 *
 * `note` has a floor here, unlike `reason` on a termination, because this floor is unconditional
 * server-side: `classifyDeductions` applies `MIN_REASON_LENGTH` to every line regardless of cause.
 * Enforcing it in the form is a strict improvement, since the alternative is a 409 listing six
 * short notes at once.
 */
export const adminDeductionFormSchema = z.object({
  /** Blank-first for the reason `adminTerminateFormSchema.cause` is. §37.6 does not permit every kind. */
  kind: z.enum(DEDUCTION_KINDS, { errorMap: () => ({ message: "Choose what this line is." }) }),
  amountInr: inr
    .min(1, "A deduction of nothing is not a line. Remove it instead.")
    .max(MAX_DEDUCTION_INR, "At most ₹10,00,000 a line."),
  note: z
    .string()
    .trim()
    .min(MIN_REASON_LENGTH, `Say what this is, in at least ${MIN_REASON_LENGTH} characters.`)
    .max(MAX_REASON_LENGTH, `At most ${MAX_REASON_LENGTH} characters.`),
});

/**
 * The settlement.
 *
 * **There is no field for the deposit itself, and that is the point.** What we hold comes from the
 * `paid` deposit row's captured amount — what the gateway told us it took — never from a request
 * body. An admin supplies only what is being taken *out*, each line justified.
 *
 * An empty list is a valid settlement and the ordinary one: the whole deposit goes back to a gym
 * that gave notice and returned an undamaged machine.
 */
export const adminSettlementFormSchema = z.object({
  deductions: z
    .array(adminDeductionFormSchema)
    .max(20, "At most 20 lines. A settlement needing more wants a document, not a form."),
});

export type AdminSettlementForm = z.infer<typeof adminSettlementFormSchema>;

export type AdminSettlementBody = {
  deductions: Array<{ kind: DeductionKind; amountInr: number; note: string }>;
};

export type AdminSettlementResult = {
  gymId: string;
  /** Always `"not_paid"`. The server says it in the response so the panel can say it on screen. */
  payoutStatus: string;
  payoutNote: string;
};
