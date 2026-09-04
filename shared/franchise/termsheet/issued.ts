/**
 * The document version this flow issues, and the one function that turns franchise state
 * into the exact text that gets hashed.
 *
 * ## What "term sheet" means in these names, since 2.0
 *
 * It means the record, not the document. `ISSUED_TERM_SHEET` is now the **Franchise Agreement** — a
 * self-executing instrument, not a term sheet — because 2.0 is the program document itself and §56
 * makes signing it the grant rather than a step towards one. Nothing about that is visible in the
 * identifiers here, and it should be read before touching anything downstream of them: a signature
 * against this is the franchise, and there is no second signing event to correct it at. In
 * particular, `TermSheetReader` now renders a 28-page binding agreement.
 *
 * The names did not move with the document, on purpose. `IssuedTermSheet`, `state.termSheet` and the
 * `termSheet*` route names are the storage and API contract, shared with the backend, so renaming
 * would be a migration and a cross-repo breaking change bought for a word. `v2.ts`'s header is where
 * the document's nature is recorded, and `version` on every issued row is what tells the two apart.
 *
 * `shared/agreement/issued.ts` and `shared/onboarding/issuedAgreement.ts` merged into one
 * file, because there is one document and one bridge and splitting them bought the gym flow
 * nothing that it needs twice. Their reasoning carries over unchanged and is not repeated:
 * one module decides which version is issued, the render options are part of the issued
 * document's identity rather than a display preference, and the **server** computes the hash.
 *
 * Three hashes end up on the record (§6.1). Only the first is computed here. `pdfHash` needs a
 * PDF renderer, which lives in the backend, and `signedPdfHash` is over a file Leegality returns.
 */

import {
  canIssue,
  renderPlainText,
  sha256Hex,
  type IssueCheck,
  type RenderOptions,
} from "../../agreement/render";
import type { Agreement } from "../../agreement/types";
import type { FranchiseOnboardingState, IssuedTermSheet } from "../onboarding/types";
import { termSheetValidUntil, toTermSheetFields } from "./fields";
import type { FranchiseTermSheetFields } from "./types";
import { FRANCHISE_AGREEMENT_V2 } from "./v2";

/**
 * 2.0 as of 2026-09-03.
 *
 * `v1.ts` is deliberately **not imported here any more**, and is deliberately still in the repo: a
 * franchisee has signed 1.0 through real Aadhaar eSign, so its bytes have to stay renderable to prove
 * what that signature was against. The golden-vector suite imports it directly for that, and
 * `goldenVector.ts` pins it. Nothing else may.
 *
 * Switching this constant is the whole cutover, and it must land in the same commit as the backend's
 * copy of this module. Split across two commits, this reader would render one version while the server
 * hashed another, and the franchisee would be shown a hash mismatch on the signing screen — the worst
 * possible place to discover it. Records already pinned at 1.0 are unaffected: an issued row carries its
 * own `version`, and nothing re-pins a row that has a signature.
 */
export const ISSUED_TERM_SHEET: Agreement = FRANCHISE_AGREEMENT_V2;

/**
 * Read off the document rather than written out again, so the string stored on an e-sign
 * record cannot drift from the text that produced its hash.
 */
export const ISSUED_TERM_SHEET_VERSION: string = ISSUED_TERM_SHEET.version;

/**
 * How tokens with no value render.
 *
 * `placeholder` rather than `throw`, for the gym flow's reason: a reader that throws leaves a
 * franchisee on a blank screen over one missing value, and the signing path is protected
 * either way because `canIssue()` refuses any document with unresolved tokens. In this flow a
 * placeholder should be unreachable — `markTermSheetViewed` refuses to pin a document with an
 * unresolved token at all — so seeing one on screen means that check was bypassed.
 *
 * It is not imported from `shared/agreement/issued.ts` even though the object is identical.
 * That constant is part of the *gym agreement's* identity, and a shared one would mean
 * changing the placeholder for one document silently changed the other's hash.
 */
export const TERM_SHEET_RENDER_OPTIONS: RenderOptions = {
  onMissing: "placeholder",
  placeholder: "__________",
};

/**
 * Fields as the reader must render them, so the document on screen and the document that was
 * hashed are the same document.
 *
 * Exported separately because `TermSheetReader` needs the fields and not the hash, and having
 * it call `toTermSheetFields` itself would put a second copy of the "which effective date"
 * decision in a component.
 */
export function issuedTermSheetFields(
  state: FranchiseOnboardingState,
  effectiveDateIso: string,
): Partial<FranchiseTermSheetFields> {
  return toTermSheetFields(state, effectiveDateIso);
}

export function renderIssuedTermSheetText(
  state: FranchiseOnboardingState,
  effectiveDateIso: string,
): string {
  return renderPlainText<FranchiseTermSheetFields>(
    ISSUED_TERM_SHEET,
    toTermSheetFields(state, effectiveDateIso),
    TERM_SHEET_RENDER_OPTIONS,
  );
}

/**
 * Whether this record may be turned into a document for signature.
 *
 * Two kinds of answer come back in one object and they are not the same kind of problem.
 * `unresolvedTokens` means *this franchise's* record is incomplete — an unapproved territory,
 * or a City tier whose commercials an admin has not set — and the fix is a write to the
 * record. `blockers` are the document's own `todo` markers: they are the same for every
 * franchise, and the fix is a decision by us. 2.0 carries one, `needs-review`, and it is counsel
 * review of the addendum — so it does not block issuing.
 */
export function canIssueTermSheet(
  state: FranchiseOnboardingState,
  effectiveDateIso: string,
): IssueCheck {
  return canIssue<FranchiseTermSheetFields>(
    ISSUED_TERM_SHEET,
    toTermSheetFields(state, effectiveDateIso),
  );
}

/**
 * Version, dates, hash and length — the record pinned at issuance.
 *
 * `pdfHash` is null: this repo has no PDF renderer. The backend's twin of this function pins it at
 * issuance, by rendering the PDF there and hashing it, so the send path can render again and compare.
 * A plausible-looking string here would be a hash somebody later trusts.
 */
export async function fingerprintIssuedTermSheet(
  state: FranchiseOnboardingState,
  effectiveDateIso: string,
): Promise<IssuedTermSheet> {
  const text = renderIssuedTermSheetText(state, effectiveDateIso);
  return {
    version: ISSUED_TERM_SHEET_VERSION,
    effectiveDate: effectiveDateIso,
    validUntil: termSheetValidUntil(effectiveDateIso),
    contentHash: await sha256Hex(text),
    length: text.length,
    pdfHash: null,
  };
}
