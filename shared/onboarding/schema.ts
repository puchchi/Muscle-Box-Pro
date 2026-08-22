/**
 * Validation for onboarding inputs, shared between the form, the mock API and
 * (later) the edge function.
 *
 * One schema rather than three: a client-side rule the server doesn't enforce is
 * theatre, and a server-side rule the client doesn't know about is a form that
 * fails on submit for no visible reason.
 *
 * These are format checks. They do not verify that a GSTIN is *registered* — that
 * needs a GSTN lookup, and it is a step 1 enhancement, not a blocker.
 */

import * as z from "zod";

/**
 * 15 characters: 2-digit state code, 10-character PAN, entity number, `Z`, checksum.
 * Worth validating properly — a wrong GSTIN on a signed agreement is expensive to
 * correct, and the shape catches most transcription slips.
 */
const GSTIN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

/** FSSAI licence / registration numbers are 14 digits. */
const FSSAI = /^[0-9]{14}$/;

/** Indian mobile or landline with optional +91. Deliberately permissive on separators. */
const PHONE = /^(\+?91[-\s]?)?[0-9][0-9\s-]{8,14}$/;

export const entityTypeSchema = z.enum(["proprietorship", "partnership", "llp", "pvt_ltd"]);

export const ENTITY_TYPE_LABELS: Record<z.infer<typeof entityTypeSchema>, string> = {
  proprietorship: "Proprietorship",
  partnership: "Partnership firm",
  llp: "LLP",
  pvt_ltd: "Private limited company",
};

export const gymDetailsSchema = z.object({
  legalEntityName: z
    .string()
    .trim()
    .min(3, "Enter the full registered name of the entity signing")
    // This is the one field that is hardest to correct after signing, because the
    // signature hash covers the rendered agreement text that contains it.
    .max(200, "That looks too long for a legal entity name"),
  entityType: entityTypeSchema,
  // Every field is present-but-possibly-empty rather than optional, so the schema's
  // input and output types match and it can drive a react-hook-form resolver
  // directly. `.default()` would make the input type optional and break that.
  tradeName: z.string().trim().max(200),
  gstin: z
    .string()
    .trim()
    .toUpperCase()
    .regex(GSTIN, "That doesn't look like a valid 15-character GSTIN"),
  // Blank is allowed because not every gym holds one, and §24.6 has not settled
  // who must. We ask anyway — better to know on day one than at an inspection.
  fssaiLicenceNumber: z
    .string()
    .trim()
    .refine((v) => v === "" || FSSAI.test(v), "An FSSAI number is 14 digits"),
  registeredAddress: z.string().trim().min(10, "Include the full registered address"),
  installationAddress: z
    .string()
    .trim()
    .min(10, "Include the full address where the machine will stand"),
  signatoryName: z.string().trim().min(3, "Who will sign the agreement?"),
  signatoryDesignation: z.string().trim().min(2, "Their designation, e.g. Director or Partner"),
  noticesEmail: z.string().trim().email("A valid email is required for formal notices"),
  noticesPhone: z.string().trim().regex(PHONE, "A valid phone number is required"),
});

export type GymDetailsInput = z.infer<typeof gymDetailsSchema>;

export const signatureSchema = z.object({
  fullName: z.string().trim().min(3, "Type your full name as it should appear"),
  designation: z.string().trim().min(2, "Your designation"),
  agreedToAgreement: z.literal(true, {
    errorMap: () => ({ message: "You need to confirm you have read the agreement" }),
  }),
  // §32 is a distinct representation about authority. Bundling it into a general
  // "I agree" weakens it, so it is validated as its own required assertion.
  authorisedToBind: z.literal(true, {
    errorMap: () => ({ message: "You need to confirm you are authorised to bind the entity" }),
  }),
  contentHash: z.string().regex(/^[0-9a-f]{64}$/, "Missing or malformed agreement hash"),
  otpCode: z.string().trim().regex(/^[0-9]{6}$/, "Enter the 6-digit code we emailed you"),
});

export const portalPasswordSchema = z
  .string()
  .min(8, "Use at least 8 characters")
  .max(72, "Passwords are limited to 72 characters");

/** Zod issues → the `fieldErrors` shape `OnboardingError` carries. */
export function toFieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    // First message per field wins — showing two errors on one input is noise.
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}
