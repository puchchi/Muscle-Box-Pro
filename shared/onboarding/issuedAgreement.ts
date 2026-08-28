/**
 * The one function that turns onboarding state into the exact text that gets hashed.
 *
 * The server calls it to compute `contentHash` when it issues the document
 * (`POST /onboarding/agreement/view`), and that fingerprint is what goes on the record, on
 * screen and on the gym's emailed copy — §47.2 of the agreement promises them both it and
 * the timestamp. Two implementations of "render the issued agreement" is the one thing this
 * module exists to make impossible — see docs/gym-onboarding.md §12 and, in `mbp-backend`,
 * `docs/gym-onboarding-api-design.md` §2.9.
 *
 * **The browser does not verify the fingerprint.** It used to: it re-rendered the document,
 * hashed it, compared, and refused to open the sign panel on any disagreement. That check
 * cost more than it caught — see §22 — and it is gone. The fingerprint is still computed and
 * stored by one side, from one code path, which is what makes it evidence.
 *
 * ## What has to be copied for the server to reproduce a hash
 *
 * More than `shared/agreement/`. The rendered text depends on three things, and the
 * backend's verbatim copy needs all of them:
 *
 *   1. the version module and the renderer — `shared/agreement/`
 *   2. `ISSUED_RENDER_OPTIONS` — the missing-token policy, now in `agreement/issued.ts`
 *   3. this file and `agreementFields.ts` — the state → fields bridge, including
 *      `MBP_NOTICES`, `formatAgreementDate`, `formatInr` and `rupeesInWords`
 *
 * (3) is easy to miss, and missing it is silent: a server that renders `₹50,000` where
 * another renders `₹ 50,000`, or `01 September 2026` where another renders `1 Sep 2026`,
 * produces a perfectly well-formed hash of a different document. The golden vector in
 * `shared/agreement/goldenVector.ts` catches drift in (1) and (2). It cannot catch drift in
 * (3), because it pins `AgreementFields` directly rather than the state they were built
 * from — so nothing catches a drifted bridge automatically now that the browser no longer
 * compares. What it would produce is a stored fingerprint that does not describe the text
 * the gym read, so a change to this file or to `agreementFields.ts` is a change to the
 * document's identity, whatever it looks like.
 */

import { ISSUED_AGREEMENT, ISSUED_AGREEMENT_VERSION, ISSUED_RENDER_OPTIONS } from "../agreement/issued";
import { renderPlainText, sha256Hex } from "../agreement/render";
import type { AgreementFields } from "../agreement/types";
import { toAgreementFields } from "./agreementFields";
import type { IssuedAgreement, OnboardingState } from "./types";

/**
 * The calendar date in India for a given instant — the Effective Date, as §4.1 means it.
 *
 * `nowIso.slice(0, 10)` was wrong and wrong in a way that only shows up at night: it
 * takes the UTC date, so a gym signing at 03:00 IST gets an agreement dated the previous
 * day. Off by one on the date that starts a 24-month term, in the hashed text, on the
 * document. India has no DST and a fixed +05:30 offset, so this is a stable answer rather
 * than a best guess — but it has to be asked in `Asia/Kolkata`, because both a Lambda and
 * a Vercel function run UTC.
 *
 * `en-CA` for the locale purely because it formats as `YYYY-MM-DD`.
 */
export function issuanceDateInIndia(nowIso: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(nowIso));
}

/**
 * The plain-text rendering that gets hashed, for a given record and effective date.
 *
 * The date is a parameter rather than read off `state.agreement`, because the server has to
 * render this *before* there is a `state.agreement` to read it from — that call is what
 * creates one.
 */
export function renderIssuedAgreementText(
  state: OnboardingState,
  effectiveDateIso: string,
): string {
  return renderPlainText(
    ISSUED_AGREEMENT,
    toAgreementFields(state, effectiveDateIso),
    ISSUED_RENDER_OPTIONS,
  );
}

/**
 * Fields as the reader must render them, so the document on screen and the document
 * that was hashed are the same document.
 *
 * Exported separately because the reader needs the fields and not the hash, and having
 * it build them by calling `toAgreementFields` itself would put a second copy of the
 * "which effective date" decision in a component.
 */
export function issuedAgreementFields(
  state: OnboardingState,
  effectiveDateIso: string,
): AgreementFields {
  return toAgreementFields(state, effectiveDateIso);
}

/**
 * Version, date, hash and length — the whole record the server pins at issuance.
 *
 * `length` is carried alongside the hash for the same reason `verifyGoldenVector` reports
 * it: if two renderings of one record ever have to be compared, equal lengths with
 * different hashes is a substituted value — a stale field, a different gym's address —
 * while different lengths is a structural difference. Without it, every difference looks
 * identical and reads as "the hash is wrong".
 */
export async function fingerprintIssuedAgreement(
  state: OnboardingState,
  effectiveDateIso: string,
): Promise<IssuedAgreement> {
  const text = renderIssuedAgreementText(state, effectiveDateIso);
  return {
    version: ISSUED_AGREEMENT_VERSION,
    effectiveDate: effectiveDateIso,
    contentHash: await sha256Hex(text),
    length: text.length,
  };
}
