/**
 * Runtime validation of the reporting endpoint's response (§15, build item 11).
 *
 * `portal.ts` says what the BFF is *supposed* to send. This says what the dashboard
 * will actually accept, and it exists because a response that crosses two trust
 * boundaries — `mbp-backend` → edge function → browser — is not made trustworthy by a
 * TypeScript type. `GymPortalSnapshot` is erased at build time; the first real
 * consequence of a renamed column is a card rendering nonsense.
 *
 * Three failure modes it is specifically here to stop, all of them things the current
 * code would do today if the fixture were replaced by a live response:
 *
 * 1. **"₹NaN" on a partner's dashboard.** `compute.ts` clamps its own inputs — a
 *    deliberate last resort — but not every rendered figure goes through it.
 *    `statementTotalInr()` adds `gymPayoutInr + electricityInr` directly, and
 *    `formatInr(NaN)` is the string "₹NaN".
 *
 * 2. **Silent zeros, which are worse than an error.** compute.ts turning a bad input
 *    into ₹0 is correct as a guard and wrong as a user experience: a gym owed ₹5,870
 *    and shown ₹0 has no way to tell that from a bad month. Validating at the boundary
 *    lets the dashboard say "we cannot show your figures right now", which is true,
 *    instead of a number that is false.
 *
 * 3. **A URL from the network in an `href`.** `statement.documentUrl` and
 *    `deposit.paymentUrl` are both rendered as links. `javascript:` in either is
 *    script execution on a page holding a Supabase session, so the scheme is checked
 *    here rather than trusted.
 *
 * 4. **An absent section mistaken for an empty one.** `GET /gym/portal` ships partial
 *    and marks what it cannot answer explicitly absent, so four sections are wrapped in
 *    `PortalSection`. Validating that wrapper is what makes the distinction survive the
 *    boundary: `{ available: true }` with no `data`, or an absence with an unrecognised
 *    `reason`, both have to fail here rather than render as a card full of nothing.
 *
 * What it deliberately does *not* do is re-derive anything. It has no calendar, no
 * knowledge of §§6–10, and no opinion about whether the figures are right — that is
 * `compute.ts`'s job and this must not become a second place where the maths lives.
 * It only asks whether each field is the kind of value it claims to be.
 */

import * as z from "zod";
import type { GymPortalSnapshot } from "./portal";

// ── Primitives ──────────────────────────────────────────────────────────────

/** A label a human reads. Empty is a bug worth surfacing, not a blank card. */
const label = z.string().min(1);

/**
 * A cup count. Integer and non-negative — cups are events that happened.
 *
 * `.int()` matters more than it looks: `paidCups: 260.5` would flow into a per-cup
 * average and out again as a plausible-looking wrong price.
 */
const cups = z.number().int().min(0);

/** Rupees that cannot be negative — sales, costs, payouts, reimbursements. */
const rupees = z.number().finite().min(0);

/**
 * Rupees that legitimately can be negative.
 *
 * Only lifetime net profit. A gym with two loss-making months has a negative
 * cumulative figure, and rejecting or clamping it would move it closer to §6.1's
 * ₹5,00,000 milestone than it actually is — an arithmetic rate rise nobody agreed to.
 */
const signedRupees = z.number().finite();

/** A share of something, as a percentage. Outside 0–100 it is not a share. */
const percent = z.number().finite().min(0).max(100);

/** "2026-08-21". */
const isoDate = z.string().date();

/** "2026-08-21T06:30:00.000Z". */
const isoTimestamp = z.string().datetime();

/**
 * A link we are willing to put in an `href`.
 *
 * Scheme allowlist, not a blocklist: `javascript:`, `data:` and `vbscript:` are the
 * known-bad ones, but the safe set is small and closed, so it is the one to enumerate.
 * A rejected URL fails the whole response rather than silently dropping the link,
 * because a missing "Download PDF" is a support call and a wrong one is an incident.
 */
const httpUrl = z
  .string()
  .url()
  .refine(
    (value) => {
      try {
        const scheme = new URL(value).protocol;
        return scheme === "https:" || scheme === "http:";
      } catch {
        return false;
      }
    },
    { message: "must be an http(s) URL" },
  );

// ── Components ──────────────────────────────────────────────────────────────

/** `mbp-backend`'s `MachineStatus`, verbatim. See the note on the type in `portal.ts`. */
const machineStatusSchema = z.enum([
  "allocated",
  "installed",
  "servicing",
  "replaced",
  "removed",
]);

const machineRecordSchema = z.object({
  model: label,
  deviceNo: z.string().min(1).nullable(),
  serialNumber: z.string().min(1).nullable(),
  status: machineStatusSchema,
  installationDate: isoDate.nullable(),
  // A timestamp, not a date — the wire carries the instant and this side formats it in
  // IST. `isoDate` here would reject every real response.
  lastServiceAt: isoTimestamp.nullable(),
});

/**
 * That gym's own `gym_terms` row.
 *
 * Every field is required. A partial terms row is the one input that must never be
 * defaulted here: `compute.ts` treats a non-positive `milestoneCups` as "test not
 * configured" and skips it, so a terms row arriving without it would quietly leave a
 * gym on 20% past 15,000 cups. That decision belongs to whoever writes the row, and
 * the dashboard's job is to refuse a row that does not carry it.
 */
const termsSchema = z.object({
  securityDepositInr: rupees,
  termMonths: z.number().int().min(0),
  gymSharePctBeforeMilestone: percent,
  gymSharePctAfterMilestone: percent,
  milestoneCups: cups,
  milestoneNetProfitInr: rupees,
  advertisingGymSharePct: percent,
  electricityInrPerBlock: rupees,
  electricityCupsPerBlock: cups,
  electricityReviewWindowMonths: z.number().int().min(0),
  settlementDaysAfterMonthEnd: z.number().int().min(0),
  // Zero and null mean different things here (§36.1 / Schedule B): zero is "nil, and
  // that is the agreed term", null is "genuinely unagreed". Both are valid; a blank
  // printing as "₹0" is how a placeholder becomes a term nobody chose.
  earlyTerminationChargeInr: rupees.nullable(),
});

/**
 * A section the endpoint may not be able to answer (`PortalSection` in `portal.ts`).
 *
 * A discriminated union on `available`, which buys two things a pair of optional fields
 * would not. Zod picks the branch from the discriminant and reports errors against *that*
 * branch, so a malformed available section says `sales.data.currentPeriod.paidCups:` and
 * not a wall of union alternatives. And `{ available: true }` with no `data` is rejected
 * — the half-response that would otherwise render an empty card.
 *
 * `reason` is an enum rather than a free string: it selects the copy on screen, and an
 * unrecognised value would fall through to whichever branch the component wrote last.
 */
const absenceSchema = z.enum(["not_implemented", "no_data_yet"]);

function section<T extends z.ZodTypeAny>(data: T) {
  return z.discriminatedUnion("available", [
    z.object({ available: z.literal(true), data }),
    z.object({ available: z.literal(false), reason: absenceSchema }),
  ]);
}

const openingSchema = z.object({
  openingPaidCups: cups,
  openingGrossExTaxInr: rupees,
  openingNetProfitInr: signedRupees,
  milestoneAlreadyReached: z.boolean().optional(),
});

/** No `adRevenueExTaxInr` — advertising is its own section. See `ShakePeriodSales`. */
const shakePeriodSalesSchema = z.object({
  period: label,
  paidCups: cups,
  grossExTaxInr: rupees,
  directVariableCostsInr: rupees,
});

const tradingFiguresSchema = z.object({
  opening: openingSchema,
  currentPeriod: shakePeriodSalesSchema,
});

const adRevenueSchema = z.object({
  period: label,
  revenueExTaxInr: rupees,
});

const electricityWindowSchema = z.object({
  label,
  paidCups: cups,
  endsOn: isoDate,
});

const statementSchema = z.object({
  period: label,
  settledOn: isoDate,
  // A record of what was paid, not a recomputation — see the note in portal.ts. Which
  // is exactly why it needs validating: nothing downstream sanitises it.
  gymPayoutInr: rupees,
  electricityInr: rupees,
  documentUrl: httpUrl.nullable(),
});

const depositReceiptSchema = z.object({
  receiptNo: label,
  amountPaise: z.number().int().min(0),
  method: label,
  paidAt: isoTimestamp,
});

const depositSchema = z
  .object({
    status: z.enum(["not_started", "pending", "paid", "deferred"]),
    receipt: depositReceiptSchema.nullable(),
    paymentUrl: httpUrl.nullable(),
  })
  .refine((deposit) => deposit.receipt === null || deposit.status === "paid", {
    // One direction only. A receipt implies money arrived, so a receipt beside any
    // other status is a contradiction and the receipt is the part that must not be
    // shown. The converse is allowed: `paid` with no receipt yet is a real state
    // while the receipt is still being generated.
    message: "a receipt is only valid when the deposit status is paid",
    path: ["receipt"],
  });

const agreementSchema = z.object({
  version: label,
  // A timestamp, for the same reason as `lastServiceAt`.
  signedAt: isoTimestamp,
  // 64 lowercase hex. The dashboard truncates it to twelve characters for display, so
  // a short or upper-case string would render as a plausible fingerprint that does not
  // match the emailed copy — the one thing the fingerprint exists to let a gym check.
  contentHash: z.string().regex(/^[0-9a-f]{64}$/, "must be a 64-character lowercase hex digest"),
});

// ── The response ────────────────────────────────────────────────────────────

export const gymPortalSnapshotSchema = z.object({
  gymDisplayName: label,
  machine: machineRecordSchema,
  terms: termsSchema,
  sales: section(tradingFiguresSchema),
  adRevenue: section(adRevenueSchema),
  electricity: section(electricityWindowSchema),
  statements: section(z.array(statementSchema)),
  deposit: depositSchema,
  agreement: agreementSchema.nullable(),
  asOf: isoTimestamp,
  // Optional, unlike `asOf`: the endpoint does not send it yet, and requiring it would
  // fail every live response into the dashboard's error state. Still validated when it
  // is there — a date-only value would print as midnight and claim a sync that did not
  // happen at midnight.
  dataSyncedAt: isoTimestamp.nullable().optional(),
});

/**
 * Proof the schema and the type have not drifted apart.
 *
 * Both directions fail `tsc`, verified by breaking it each way: a field retyped here
 * (`gymDisplayName: z.number()`) and a field dropped from here but still on the type
 * (`statements`) each produce TS1360. So `portal.ts` cannot gain a field, lose one, or
 * change one without this file being updated — which is the property that keeps a
 * validator from silently validating last month's shape.
 */
export const _typeCheck = gymPortalSnapshotSchema satisfies z.ZodType<GymPortalSnapshot>;

export type GymPortalSnapshotParse =
  | { ok: true; snapshot: GymPortalSnapshot }
  | { ok: false; issues: string[] };

/**
 * Validate a reporting response.
 *
 * Returns a result rather than throwing so the caller decides what a bad response
 * looks like on screen. `issues` are `path: message` strings, meant for a log or a
 * developer-facing detail line — not for a gym owner, who gets told the figures are
 * unavailable and nothing about our field names.
 */
export function parseGymPortalSnapshot(value: unknown): GymPortalSnapshotParse {
  const result = gymPortalSnapshotSchema.safeParse(value);
  if (result.success) return { ok: true, snapshot: result.data };

  return {
    ok: false,
    issues: result.error.issues.map((issue) => {
      const path = issue.path.join(".");
      return path ? `${path}: ${issue.message}` : issue.message;
    }),
  };
}
