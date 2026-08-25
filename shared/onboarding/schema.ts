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

export const entityTypeSchema = z.enum([
  "proprietorship",
  "partnership",
  "llp",
  "pvt_ltd",
  // See `EntityType` in `./types` for why this exists. Last in the list on purpose: the four
  // registered forms are the answer for most gyms, and this is the one to fall back to.
  "unregistered",
]);

/** Label order is dropdown order — `StepDetails` maps this object directly. */
export const ENTITY_TYPE_LABELS: Record<z.infer<typeof entityTypeSchema>, string> = {
  proprietorship: "Proprietorship",
  partnership: "Partnership firm",
  llp: "LLP",
  pvt_ltd: "Private limited company",
  // Names the state of affairs rather than offering "Other", which reads as a category and would
  // leave us guessing which one. Someone who does have an entity type we have not listed picks the
  // closest registered form; someone who has none picks this.
  unregistered: "Not registered / individual",
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
  /**
   * Optional since 2026-08-24, and blank-or-valid rather than loosened.
   *
   * It was required, on the reasoning that a gym selling through a machine on its floor is making
   * supplies. What changed is not that reasoning but where it belongs: the agreement never renders
   * a GSTIN (see `toAgreementFields`), so this is an invoicing detail, and blocking step 1 on a
   * certificate someone has to go and find costs more than raising the first invoice late.
   *
   * A number that *is* entered still has to be a real one. A transposed digit bills the wrong
   * entity for the whole term, which is worse than no number at all.
   */
  gstin: z
    .string()
    .trim()
    .toUpperCase()
    .refine((v) => v === "" || GSTIN.test(v), "That doesn't look like a valid 15-character GSTIN"),
  /**
   * Still stored, no longer asked for.
   *
   * No screen collects this as of 2026-08-24: the admin invite form dropped it and step 1 dropped
   * it. It stays on the type and in this schema so the value round-trips — gyms that answered it
   * before then have one, `GET /admin/gyms/{gymId}` still reports it, and the deployed server still
   * accepts it. Blank is what every new gym will have.
   *
   * §24.5 and Schedule F leave each party responsible for its own registrations, which is why
   * dropping the question costs nothing contractually.
   */
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
  // §32 is a distinct representation about authority, so it stays its own required field
  // on the record even though step 3 now collects both in one sentence.
  authorisedToBind: z.literal(true, {
    errorMap: () => ({ message: "You need to confirm you are authorised to bind the entity" }),
  }),
  contentHash: z.string().regex(/^[0-9a-f]{64}$/, "Missing or malformed agreement hash"),
  /**
   * Optional, because signing ships before SES does — see `SIGNING_REQUIRES_OTP`.
   *
   * `.optional()` rather than allowing `""`: the server distinguishes absent from
   * malformed and rejects a request that carries the field at all while OTP is off, so
   * an empty string has to fail the schema rather than pass as "no code".
   */
  otpCode: z
    .string()
    .trim()
    .regex(/^[0-9]{6}$/, "Enter the 6-digit code we emailed you")
    .optional(),
});

/**
 * Both bounds are the server's, not ours: `MIN_PASSWORD_LENGTH` and `MAX_PASSWORD_LENGTH` in
 * `mbp-backend` `services/onboarding/src/domain/password.ts`. This said 8 and 72 while the
 * server said 12 and 200, so every gym typing an eight-character password passed the form,
 * lost a round trip, and got "Please check the highlighted fields." on a screen with nothing
 * highlighted. A number here that is looser than the server's is a form that lies.
 *
 * The server also screens a denylist and rejects too few distinct characters. Those are not
 * mirrored — a corpus check cannot be — so `fieldErrors.password` still has to be rendered.
 */
export const portalPasswordSchema = z
  .string()
  .min(12, "Use at least 12 characters")
  .max(200, "Passwords are limited to 200 characters");

/**
 * The address the portal account is created under.
 *
 * `POST /gym/account` validates it with `looksLikeEmail` and answers `fieldErrors.email` —
 * a key no screen in this flow has an input for, so an invalid one reaching the API is a
 * banner with nothing to correct. Checked before the request instead.
 */
export const portalEmailSchema = z.string().trim().email("A valid email is required");

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
