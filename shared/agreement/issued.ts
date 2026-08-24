/**
 * The agreement version this flow currently issues.
 *
 * One module decides, and everything else asks. Before this existed the decision was
 * spread across three files that each answered independently, and they disagreed:
 * `StepReviewSign` rendered and hashed v2.2 while the record written at signing said
 * `version: "2.1"`. That combination is worse than either being wrong on its own,
 * because verifying a signature means re-rendering *the recorded version* with the
 * recorded fields and comparing hashes — so a record naming the wrong version cannot be
 * verified at all, and the hash stops being evidence. The whole point of storing it is
 * to survive that question years later.
 *
 * The document and its plain-language panel are exported together deliberately. Their
 * pairing is the thing most likely to half-change: rendering v2.2 above a summary
 * written for v2.1 puts a panel on screen describing clauses the reader below does not
 * contain, which is precisely the failure the panel exists to prevent.
 *
 * Issuing a new version is a change to the three lines below and nothing else.
 *
 * Note what this is *not*: a way to re-point old records. A version file is frozen once
 * anything has been signed against it (`v2_1.ts` is frozen for that reason), and a
 * stored agreement always renders from the version *it* names — never from this
 * constant. See docs/gym-onboarding.md §12.
 */

import { AGREEMENT_V2_3 } from "./v2_3";
import { PLAIN_LANGUAGE_V2_3, type PlainLanguageItem } from "./plainLanguage";
import type { RenderOptions } from "./render";
import type { Agreement } from "./types";

export const ISSUED_AGREEMENT: Agreement = AGREEMENT_V2_3;

/**
 * How tokens with no value render — part of the issued document's identity, not a
 * display preference.
 *
 * `placeholder` rather than `throw`, because a reader that throws leaves a gym on a blank
 * screen over a missing serial number. v2.3 removed the tokens that made that routine —
 * the machine identifiers and the installation date are no longer in the document at all,
 * so an issued 2.3 should resolve completely — but 2.1 and 2.2 still contain them and
 * still have to render from current state for verification. The signing path is protected
 * either way: `canIssue()` refuses any agreement with unresolved tokens, so a placeholder
 * can be *read* but never *signed* around.
 *
 * It lives here, next to the version it applies to, because the reader, the PDF and
 * whoever computes the hash must all pass the same object. It used to be exported from
 * `AgreementReader.tsx`, which was fine while the browser was the only thing that
 * hashed: now that the server computes the hash and the client only checks it, a
 * constant inside a `"use client"` React component is not something the server can
 * import. A second copy with a different placeholder string would produce two
 * hashes for one document and no way to tell which one a signature attested to.
 */
export const ISSUED_RENDER_OPTIONS: RenderOptions = {
  onMissing: "placeholder",
  placeholder: "__________",
};

export const ISSUED_PLAIN_LANGUAGE: readonly PlainLanguageItem[] = PLAIN_LANGUAGE_V2_3;

/**
 * Read off the document rather than written out again, so the string stored on a
 * signature record cannot drift from the text that produced its hash.
 */
export const ISSUED_AGREEMENT_VERSION: string = ISSUED_AGREEMENT.version;
