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
import { INDIA_PINCODE, districtsOf, isKnownState } from "../../geo/india";
import { FRANCHISE_TIERS } from "../program";

/**
 * Five letters, four digits, one letter.
 *
 * Format only. The fourth character is the holder's class, and this deliberately does not check
 * it against the entity type: an applicant who has not incorporated anything yet signs on their
 * own PAN, and refusing it would stop the applications this programme most wants.
 */
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
    // The CIN is deliberately not required of a company: it is an identifier we can look up
    // from the legal entity name, and an applicant who does not have the certificate to hand
    // should not be stopped on step 1 over it. A number that is typed is still format-checked.
    if (value.entityType === "llp" && value.llpin === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["llpin"],
        message: "An LLP's LLPIN is required",
      });
    }
  });

/**
 * Step 2. A district rather than prose — see `TerritoryProposal`.
 *
 * The district names are checked against `shared/geo/india.ts` and the state has to be one we
 * hold, because the picker is the only thing that writes them and a name it could not have
 * produced is a value nothing downstream can render. That is a different judgement from the PAN
 * above: there, refusing meant refusing a real applicant, and here it means refusing a payload the
 * form cannot have sent.
 *
 * The backend's `validateTerritoryProposal` is the twin of this and still allows 60. It is the
 * looser of the two, so nothing breaks, but the rule is only enforced here until it moves too.
 */
export const territoryProposalSchema = z
  .object({
    tier: tierIdSchema,
    proposedState: z
      .string()
      .trim()
      .min(2, "Choose the state or union territory")
      .refine(isKnownState, "Choose a state or union territory from the list"),
    proposedDistricts: z
      .array(z.string().trim().min(2))
      .min(1, "Choose the district you want to develop")
      // An array of one rather than a string, because what is granted can be more than one district
      // and the two are the same field on the record.
      .max(1, "One district per application. Ask for the rest in the box below"),
    proposedPincodes: z
      .array(z.string().trim().regex(INDIA_PINCODE, "A pin code is six digits"))
      .max(300, "That is too many pin codes to list. Describe the area in the box below instead"),
    proposedBoundary: z.string().trim().max(2000),
    existingRelationships: z.string().trim().max(2000),
  })
  .superRefine((value, ctx) => {
    // A district from the wrong state is the one wrong selection the form can produce on its own:
    // switching state has to clear the districts, and this is what notices if it ever stops doing
    // that.
    const withinState = new Set(districtsOf(value.proposedState));
    const strays = value.proposedDistricts.filter((d) => !withinState.has(d));
    if (strays.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["proposedDistricts"],
        message: `Not in ${value.proposedState}: ${strays.join(", ")}`,
      });
    }
  });

/**
 * The one-line version, for a list, a heading, or the admin's grant field to start from.
 *
 * Every district named rather than "3 districts", because the reader is deciding whether to grant
 * them and a count is not a decision. Long selections get long, which a territory covering
 * twelve districts should.
 */
export function franchiseTerritoryLabel(proposal: {
  proposedState: string;
  proposedDistricts: readonly string[];
}): string {
  const districts = proposal.proposedDistricts.filter((d) => d.trim() !== "");
  if (districts.length === 0) return proposal.proposedState;
  const named =
    districts.length === 1
      ? districts[0]
      : `${districts.slice(0, -1).join(", ")} and ${districts[districts.length - 1]}`;
  return `${named}, ${proposal.proposedState}`;
}

/**
 * The proposal turned into the prose an admin's `grantedBoundary` field starts from.
 *
 * A starting point and nothing more. `territory.ts` in the backend refuses to supply a
 * proposal-to-grant function on purpose, because the convenience version of that is the one that
 * silently grants a city to somebody who asked for a state. This is the frontend's paste button: an
 * admin still has to read it, and is expected to cut it.
 *
 * The pin codes go in as a sentence rather than a list under a heading, because this text is
 * rendered into the term sheet and hashed, and a sentence is what the definitive agreement will
 * carry.
 */
export function franchiseTerritoryGrantDraft(proposal: {
  proposedState: string;
  proposedDistricts: readonly string[];
  proposedPincodes: readonly string[];
  proposedBoundary: string;
}): string {
  const districts = proposal.proposedDistricts.filter((d) => d.trim() !== "");
  if (districts.length === 0) return proposal.proposedBoundary.trim();

  const noun = districts.length === 1 ? "district" : "districts";
  const parts = [
    `The ${noun} of ${franchiseTerritoryLabel(proposal)}.`,
  ];
  if (proposal.proposedPincodes.length > 0) {
    parts.push(`Limited to the pin codes ${proposal.proposedPincodes.join(", ")}.`);
  }
  const notes = proposal.proposedBoundary.trim();
  if (notes !== "") parts.push(notes);
  return parts.join(" ");
}

/**
 * Step 6, without the conditional rules `warehouseNotIdentified` puts on three of its fields.
 *
 * Split out because the rules need `.superRefine()`, which returns a `ZodEffects` with no
 * `.shape`, and the wizard reads the shape to decide which step a server field error belongs to.
 * `OPERATIONS_FIELD_NAMES` below is what it reads instead.
 */
const operationsFields = z.object({
  /**
   * A boolean where `temperatureControl` refuses to be one, and the difference is what an
   * untouched form sends: unticked with an empty address fails, so `true` here can only have
   * been ticked on purpose. `.default(false)` so a client that predates the field still parses.
   */
  warehouseNotIdentified: z.boolean().default(false),
  warehouseAddress: z.string().trim(),
  /**
   * A number rather than a string, because it is a quantity we will compare against a
   * requirement. The form registers it with `valueAsNumber`, which sends `NaN` for an empty
   * input, and `NaN` is not `null`: it fails the number check and gets `invalid_type_error`.
   */
  warehouseAreaSqft: z
    .number({ invalid_type_error: "Enter the area in square feet" })
    .int("Round to the nearest square foot")
    .min(100, "That looks too small to hold a protein consignment")
    .max(1_000_000, "That looks too large to be a square-foot figure")
    .nullable(),
  temperatureControl: z.enum(["yes", "no", ""], {
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
    .min(2, "Tell us how you plan to place your machines. Write NA if it is not decided yet.")
    .max(2000),
  logisticsArrangement: z.enum(["own_vehicle", "contracted", "undecided"], {
    errorMap: () => ({ message: "Choose how you plan to move stock and machines" }),
  }),
});

/**
 * Step 6.
 *
 * The three warehouse fields are required unless the franchisee has told us there is no
 * warehouse yet, and empty unless they have. Both halves are enforced: a stored address under a
 * ticked box is an address no screen would ever show again.
 */
export const operationsReadinessSchema = operationsFields.superRefine((value, ctx) => {
  if (value.warehouseNotIdentified) {
    if (value.warehouseAddress !== "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["warehouseAddress"],
        message: "Clear the address, or untick the box above",
      });
    }
    if (value.warehouseAreaSqft !== null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["warehouseAreaSqft"],
        message: "Clear the area, or untick the box above",
      });
    }
    if (value.temperatureControl !== "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["temperatureControl"],
        message: "Clear the storage answer, or untick the box above",
      });
    }
    return;
  }

  if (value.warehouseAddress.length < 10) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["warehouseAddress"],
      message: "Include the full address of the warehouse the protein will be delivered to",
    });
  }
  if (value.warehouseAreaSqft === null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["warehouseAreaSqft"],
      message: "Enter the area in square feet",
    });
  }
  if (value.temperatureControl === "") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["temperatureControl"],
      message: "Tell us whether the warehouse is temperature controlled",
    });
  }
});

/** The step-6 field names, for the `.shape` lookup `operationsReadinessSchema` no longer offers. */
export const OPERATIONS_FIELD_NAMES: readonly string[] = Object.keys(operationsFields.shape);

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
