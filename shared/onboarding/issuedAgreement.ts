/**
 * The one function that turns onboarding state into the exact text that gets hashed.
 *
 * There is exactly one caller shape on each side of the wire and they call the same
 * function: the server calls it to *compute* `contentHash` when it issues the document
 * (`POST /onboarding/agreement/view`), and the browser calls it to *check* that the
 * text it is about to put on screen still hashes to the value the server pinned. Two
 * implementations of "render the issued agreement" is the one thing this module exists
 * to make impossible — see docs/gym-onboarding.md §12 and, in `mbp-backend`,
 * `docs/gym-onboarding-api-design.md` §2.9.
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
 * the browser rendered `₹ 50,000`, or `01 September 2026` where the browser rendered
 * `1 Sep 2026`, produces a perfectly well-formed hash that matches nothing. The golden
 * vector in `shared/agreement/goldenVector.ts` catches drift in (1) and (2). It cannot
 * catch drift in (3), because it pins `AgreementFields` directly rather than the state
 * they were built from — so the equality check the browser performs at step 3 is the
 * only thing that catches a drifted bridge, which is why it blocks signing rather than
 * warning.
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
 * The date is a parameter rather than read off `state.agreement`, because the server
 * has to render this *before* there is a `state.agreement` to read it from — that call
 * is what creates one.
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
 * `length` is carried alongside the hash for the same reason `verifyGoldenVector`
 * reports it: on a mismatch it says *how* the two renderings differ. Equal lengths with
 * different hashes is a substituted value — a stale field, a different gym's address.
 * Different lengths is a structural difference — a clause, a placeholder, a whitespace
 * policy. Without it, every drift looks identical and reads as "the hash is wrong".
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

export type IssuedAgreementCheck =
  | {
      ok: true;
      /**
       * What this client rendered — equal to the pinned hash, since that is what `ok`
       * means, but carried out rather than discarded so callers can submit the value
       * they computed instead of echoing back the one they were given. Reading it off
       * `state.agreement` at submit time would make `SignatureInput.contentHash` a copy
       * of the server's own field and the comparison a comparison with itself.
       */
      contentHash: string;
      length: number;
    }
  | {
      ok: false;
      /** Which figures differ, and by how much. Safe to log; never shown to a gym. */
      problems: string[];
      computed: { contentHash: string; length: number };
    };

/**
 * Does the text this client is about to display still hash to what the server pinned?
 *
 * The browser's half of the inversion. It no longer supplies the hash as truth — the
 * server computed one at issuance and will compute it again at signing — but it keeps
 * computing its own and refuses to sign unless the two agree. That converts a drifted
 * renderer, a drifted field bridge or a mid-flow change to the gym's own details into a
 * disabled button in development, instead of a rejected signature in front of a gym
 * who has already read forty-seven sections.
 *
 * A mismatch is never the gym's fault and is never actionable by them, so callers show
 * a neutral "not ready" state and put the detail in `problems` where we can see it.
 */
export async function checkIssuedAgreement(
  state: OnboardingState,
  pinned: IssuedAgreement,
): Promise<IssuedAgreementCheck> {
  const text = renderIssuedAgreementText(state, pinned.effectiveDate);
  const contentHash = await sha256Hex(text);
  const problems: string[] = [];

  if (ISSUED_AGREEMENT_VERSION !== pinned.version) {
    problems.push(
      `this client issues ${ISSUED_AGREEMENT_VERSION}, the record was issued as ${pinned.version}`,
    );
  }
  if (text.length !== pinned.length) {
    problems.push(`rendered ${text.length} characters, the record pins ${pinned.length}`);
  }
  if (contentHash !== pinned.contentHash) {
    problems.push(`rendered hash ${contentHash}, the record pins ${pinned.contentHash}`);
  }

  return problems.length === 0
    ? { ok: true, contentHash, length: text.length }
    : { ok: false, problems, computed: { contentHash, length: text.length } };
}
