/**
 * Validation for franchise onboarding inputs, shared between the forms, the mock and the
 * handlers.
 *
 * One schema rather than three, for the reason `shared/onboarding/schema.ts` gives: a
 * client-side rule the server does not enforce is theatre, and a server-side rule the client
 * does not know about is a form that fails on submit for no visible reason. `GSTIN` and
 * `PHONE` are imported from that file rather than re-declared, because two copies of a
 * pattern is two patterns.
 *
 * These are format checks. Nothing here proves a PAN is issued, a CIN is registered or a UTR
 * exists. The UTR in particular is checked by a human against a bank statement, which is the
 * only check that means anything (§7.3).
 */

import * as z from "zod";

import { GSTIN, PHONE, entityTypeSchema } from "../../onboarding/schema";
import type { EntityType } from "../../onboarding/types";
import { FRANCHISE_TIERS } from "../program";

/** Five letters, four digits, one letter. The fourth letter is the entity class — see below. */
const PAN = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

/** 21 characters: listing status, industry, state, year, ownership, registration number. */
const CIN = /^[LU][0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$/;

/** LLP identification numbers are three letters, a hyphen, four digits. */
const LLPIN = /^[A-Z]{3}-[0-9]{4}$/;

/**
 * Deliberately permissive. NEFT references are 16 characters, RTGS references are commonly
 * 22, and different banks print them with different prefixes. A regex that refused a real
 * transfer would be the worst outcome on this screen, so this checks only that the value
 * looks like a bank reference rather than a sentence.
 */
const UTR = /^[A-Z0-9]{12,22}$/;

/**
 * The fourth character of a PAN is the holder's class, and checking it against the entity type
 * catches the single most common paste error: a personal PAN entered for a company.
 *
 * Worth having because it is one field to fix here, and a term sheet naming the wrong taxpayer
 * after it has been hashed and signed is not (§3). LLPs are issued firm PANs, so `llp` and
 * `partnership` share `F`.
 */
const PAN_CLASS: Record<EntityType, string> = {
  proprietorship: "P",
  partnership: "F",
  llp: "F",
  pvt_ltd: "C",
  unregistered: "P",
};

const PAN_CLASS_LABEL: Record<string, string> = {
  P: "an individual",
  F: "a firm or LLP",
  C: "a company",
};

const tierIdSchema = z.enum(
  FRANCHISE_TIERS.map((t) => t.id) as [string, ...string[]],
  { errorMap: () => ({ message: "Choose a franchise tier" }) },
);

/**
 * Step 1.
 *
 * Every field is present-but-possibly-empty rather than optional, so the schema's input and
 * output types match and it can drive a react-hook-form resolver directly. `.default()` would
 * make the input type optional and break that.
 */
export const franchiseDetailsSchema = z
  .object({
    legalEntityName: z
      .string()
      .trim()
      .min(3, "Enter the full registered name of the entity taking the franchise")
      // The field hardest to correct after signing, because the signature covers the rendered
      // term sheet text that contains it.
      .max(200, "That looks too long for a legal entity name"),
    entityType: entityTypeSchema,
    tradeName: z.string().trim().max(200),
    pan: z
      .string()
      .trim()
      .toUpperCase()
      .regex(PAN, "A PAN is five letters, four digits and a letter"),
    gstin: z
      .string()
      .trim()
      .toUpperCase()
      .refine(
        (v) => v === "" || GSTIN.test(v),
        "That doesn't look like a valid 15-character GSTIN",
      ),
    cin: z
      .string()
      .trim()
      .toUpperCase()
      .refine((v) => v === "" || CIN.test(v), "A CIN is 21 characters, starting with L or U"),
    llpin: z
      .string()
      .trim()
      .toUpperCase()
      .refine((v) => v === "" || LLPIN.test(v), "An LLPIN looks like AAA-1234"),
    registeredAddress: z.string().trim().min(10, "Include the full registered address"),
    signatoryName: z.string().trim().min(3, "Who will sign the term sheet?"),
    signatoryDesignation: z.string().trim().min(2, "Their designation, e.g. Director or Partner"),
    signatoryPan: z
      .string()
      .trim()
      .toUpperCase()
      .regex(PAN, "The signatory's own PAN, as five letters, four digits and a letter"),
    /**
     * Blank-or-four-digits rather than required. It is collected for reconciliation, not for
     * verification (§6.5), and a signatory using a digital signature certificate rather than
     * Aadhaar eSign has no reason to supply one.
     */
    signatoryAadhaarLast4: z
      .string()
      .trim()
      .refine((v) => v === "" || /^[0-9]{4}$/.test(v), "The last four digits, or leave it blank"),
    noticesEmail: z.string().trim().email("A valid email is required for formal notices"),
    noticesPhone: z.string().trim().regex(PHONE, "A valid phone number is required"),
  })
  .superRefine((value, ctx) => {
    const expected = PAN_CLASS[value.entityType];
    if (PAN.test(value.pan) && value.pan[3] !== expected) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["pan"],
        message: `This PAN belongs to ${PAN_CLASS_LABEL[value.pan[3]] ?? "another kind of holder"}. For this entity type we need ${PAN_CLASS_LABEL[expected]}'s PAN.`,
      });
    }
    // Asked for only where one exists, so refusing a blank is refusing to skip a question
    // that was put to them. A company with no CIN is not a company.
    if (value.entityType === "pvt_ltd" && value.cin === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["cin"],
        message: "A company's CIN is required",
      });
    }
    if (value.entityType === "llp" && value.llpin === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["llpin"],
        message: "An LLP's LLPIN is required",
      });
    }
  });

/** Step 2. Free text on purpose — see `TerritoryProposal`. */
export const territoryProposalSchema = z.object({
  tier: tierIdSchema,
  proposedTerritory: z
    .string()
    .trim()
    .min(3, "Which city, district or region do you want to develop?"),
  proposedBoundary: z
    .string()
    .trim()
    .min(20, "Describe where the territory starts and stops: suburbs, pin codes, landmarks")
    .max(2000),
  existingRelationships: z.string().trim().max(2000),
});

/** Step 6. */
export const operationsReadinessSchema = z.object({
  warehouseAddress: z
    .string()
    .trim()
    .min(10, "Include the full address of the warehouse the protein will be delivered to"),
  /**
   * A number rather than a string, because it is a quantity we will compare against a
   * requirement. The form registers it with `valueAsNumber`.
   */
  warehouseAreaSqft: z
    .number({ invalid_type_error: "Enter the area in square feet" })
    .int("Round to the nearest square foot")
    .min(100, "That looks too small to hold a protein consignment")
    .max(1_000_000, "That looks too large to be a square-foot figure"),
  temperatureControl: z.enum(["yes", "no"], {
    errorMap: () => ({ message: "Tell us whether the warehouse is temperature controlled" }),
  }),
  operationsContactName: z
    .string()
    .trim()
    .min(3, "Who will look after the machines day to day?"),
  operationsContactPhone: z.string().trim().regex(PHONE, "A valid phone number is required"),
  deploymentPlan: z
    .string()
    .trim()
    .min(20, "How and by when do you plan to place your machines?")
    .max(2000),
  logisticsArrangement: z.enum(["own_vehicle", "contracted", "undecided"], {
    errorMap: () => ({ message: "Choose how you plan to move stock and machines" }),
  }),
});

/**
 * Step 8's claim.
 *
 * `amountPaise` is an integer because money is paise everywhere in this flow, and the form
 * multiplies the rupee figure it collects. Reconciling a ₹12,50,000 transfer against a float
 * is not something to do twice.
 */
export const paymentClaimSchema = z.object({
  utr: z
    .string()
    .trim()
    .toUpperCase()
    .regex(UTR, "Enter the UTR or reference number your bank gave you"),
  amountPaise: z
    .number({ invalid_type_error: "Enter the amount you transferred" })
    .int("Amounts are in whole paise")
    .positive("Enter the amount you transferred"),
  paidOn: z
    .string()
    .trim()
    .regex(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/, "When did you make the transfer?"),
  proofDocId: z.string().trim().nullable(),
});

/**
 * What the bucket accepts, bounded here so the same limits go into the presigned PUT policy
 * itself rather than being checked after the fact (§9).
 */
export const ALLOWED_DOCUMENT_CONTENT_TYPES: readonly string[] = [
  "application/pdf",
  "image/jpeg",
  "image/png",
];

export const MAX_DOCUMENT_BYTES = 8 * 1024 * 1024;

export const documentUploadSchema = z.object({
  docType: z.enum([
    "pan_card",
    "entity_proof",
    "address_proof",
    "signatory_id",
    "financial_evidence",
    "payment_proof",
  ]),
  fileName: z.string().trim().min(1).max(255),
  contentType: z
    .string()
    .refine(
      (v) => ALLOWED_DOCUMENT_CONTENT_TYPES.includes(v),
      "Upload a PDF, a JPEG or a PNG",
    ),
  sizeBytes: z
    .number()
    .int()
    .positive("That file appears to be empty")
    .max(MAX_DOCUMENT_BYTES, "Files are limited to 8 MB"),
});

/**
 * Both bounds are the server's. `shared/onboarding/schema.ts` explains why a form may never be
 * looser than the endpoint it posts to; the franchise portal shares
 * `mbp-backend`'s `domain/password.ts`, so the numbers are the same ones.
 */
export const franchisePasswordSchema = z
  .string()
  .min(8, "Use at least 8 characters")
  .max(200, "Passwords are limited to 200 characters");

export const franchiseEmailSchema = z.string().trim().email("A valid email is required");

/** Zod issues → the `fieldErrors` shape `FranchiseOnboardingError` carries. */
export function toFranchiseFieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    // First message per field wins — showing two errors on one input is noise.
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}
