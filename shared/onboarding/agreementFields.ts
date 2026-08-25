/**
 * Bridge from onboarding state to agreement template fields.
 *
 * This is the only place the two contracts meet. Keeping it in one function means
 * `findUnresolvedTokens(ISSUED_AGREEMENT, toAgreementFields(state))` is a single
 * assertion a test can make — so a clause added in a future version with a token
 * nobody wired up fails in CI rather than in front of a gym.
 *
 * A field stays on the type after the document stops using it (`mbpNotices.phone` is the
 * live example), because the text a signature attests to has to keep rendering from
 * current state, or the stored fingerprint stops being reproducible and therefore stops
 * being evidence.
 *
 * Everything here comes from the server's onboarding state, which is read from
 * `gyms` / `gym_terms` / `machines`. Never from the session token, and never from
 * `user_metadata` — that field is writable by the account holder.
 */

import { formatInr } from "../partnership/summary";
import { rupeesInWords } from "../agreement/amountInWords";
import type { AgreementFields } from "../agreement/types";
import type { OnboardingState } from "./types";

/** A §41 notices value we have to supply before the first agreement is issued. */
export const NOTICES_PENDING = "To be provided";

/**
 * MuscleBoxPro's §41 notices block.
 *
 * `phone` is deliberately empty rather than "To be provided": we do not publish a
 * number for notices, and notice is served by email and by post to the address below.
 * v2.2's §41 therefore lists only address and email as notice channels for either
 * party, and says in terms that telephone is not a channel for formal notice — a
 * channel a gym cannot use is worse than a channel the clause does not offer, because
 * a notice attempted down it and missed is still arguably served. The field stays on
 * the type because v2.1's §41 table still references `{{mbpNotices.phone}}`, and a
 * frozen version has to keep rendering.
 *
 * REMAINING GAP, `needs-review` rather than blocking: the address has the PIN but no
 * building or street line. Post addressed to "Sector 75, Noida, 201301" will
 * plausibly arrive, and email is the primary channel, so this no longer stops a
 * send — but it should be replaced with the registered office exactly as it reads on
 * the LLP incorporation certificate before the first agreement is executed.
 */
export const MBP_NOTICES = {
  address: "BlendBox Innovations LLP, Sector 75, Noida, Uttar Pradesh 201301, India",
  email: "contact@muscleboxpro.com",
  phone: "",
} as const;

/**
 * "2026-08-22" → "22 August 2026". Formal-document style, no ordinals.
 *
 * **Takes a date, never a timestamp.** It formats in UTC deliberately, because its output
 * goes inside the hashed agreement text and the same record must render identically on
 * every machine. That makes it the wrong function for anything with a time in it: a
 * moment at 01:00 IST formats here as the previous day. `formatIstDate` in
 * `GymDashboard.tsx` is the one for timestamps a person reads.
 */
export function formatAgreementDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  // Fixed locale and UTC, because this string ends up inside the hashed text —
  // the same record must not render differently on two machines.
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

/** Rendered into a field that has no value yet, e.g. a serial number pre-shipping. */
export const TO_BE_COMPLETED = "To be completed at installation";

/**
 * Machine identifiers and the installation date are blank at signing — the unit
 * has not shipped. They render as "To be completed at installation" and are
 * captured for real when Schedule A is signed on site (§6).
 *
 * `effectiveDate` is the signing date. It is deliberately NOT the commencement
 * date: §4.1 runs the term from the later of signing and installation, so the two
 * stay separate fields all the way down.
 */
export function toAgreementFields(
  state: OnboardingState,
  effectiveDateIso: string,
): AgreementFields {
  const { details, terms, machine } = state;

  return {
    gymLegalName: details.legalEntityName,
    effectiveDate: formatAgreementDate(effectiveDateIso),

    machineModel: machine.model,
    machineId: machine.deviceNo ?? TO_BE_COMPLETED,
    serialNumber: machine.serialNumber ?? TO_BE_COMPLETED,
    machineValue: formatInr(machine.valueInr),
    installationDate: machine.installationDate
      ? formatAgreementDate(machine.installationDate)
      : TO_BE_COMPLETED,
    installationAddress: details.installationAddress,
    accessories: machine.accessories,

    securityDeposit: formatInr(terms.securityDepositInr),
    // Both from the same integer, so §5.1 cannot state one amount as a figure and a
    // different one in words. See shared/agreement/amountInWords.ts.
    securityDepositInWords: rupeesInWords(terms.securityDepositInr),
    termMonths: String(terms.termMonths),

    mbpNotices: { ...MBP_NOTICES },
    gymNotices: {
      // §41 notices go to the address the gym nominated, which is the registered
      // address rather than the installation address — a notice served at a gym
      // floor is not a notice served on the entity.
      address: details.registeredAddress,
      email: details.noticesEmail,
      phone: details.noticesPhone,
    },

    signatoryName: details.signatoryName,
    signatoryDesignation: details.signatoryDesignation,
  };
}
