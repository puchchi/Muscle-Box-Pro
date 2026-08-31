/**
 * The term sheet version this flow issues, and the one function that turns franchise state
 * into the exact text that gets hashed.
 *
 * `shared/agreement/issued.ts` and `shared/onboarding/issuedAgreement.ts` merged into one
 * file, because there is one document and one bridge and splitting them bought the gym flow
 * nothing that it needs twice. Their reasoning carries over unchanged and is not repeated:
 * one module decides which version is issued, the render options are part of the issued
 * document's identity rather than a display preference, and the **server** computes the hash.
 *
 * Three hashes end up on the record (§6.1). Only the first is computed here. `pdfHash` needs a
 * PDF renderer, which lives in the backend, and `signedPdfHash` is over a file Digio returns.
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
import { FRANCHISE_TERM_SHEET_V1 } from "./v1";

export const ISSUED_TERM_SHEET: Agreement = FRANCHISE_TERM_SHEET_V1;

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
 * franchise, and the fix is a decision by us. v1 carries one, and it is about the money (§11,
 * phase 3).
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
 * `pdfHash` is null: this repo has no PDF renderer, and the backend fills it in when it
 * generates the file it hands Digio. A plausible-looking string here would be a hash somebody
 * later trusts.
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
