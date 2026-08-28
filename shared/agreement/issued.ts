/**
 * The agreement version this flow issues.
 *
 * One module decides, and everything else asks. Before this existed the decision was
 * spread across three files that each answered independently, and they disagreed: the
 * reader rendered and hashed one version while the record written at signing named
 * another, so the stored version string described a document nobody had rendered.
 *
 * The document and its plain-language panel are exported together deliberately. Their
 * pairing is the thing most likely to half-change: rendering one version above a summary
 * written for another puts a panel on screen describing clauses the reader below does not
 * contain, which is precisely the failure the panel exists to prevent.
 *
 * **There is one version, and it is this one.** The flow used to carry a registry of every
 * version it had ever issued so a record could be re-rendered from the version it named;
 * that was removed with the browser-side hash check that needed it (§22). A new version
 * means changing the two constants below — and, before that, deciding what happens to
 * records pinned to the old one, because nothing here answers that question any more.
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
 * screen over one missing value. v2.3 removed the tokens that made that routine — the
 * machine identifiers and the installation date are no longer in the document at all — so
 * an issued 2.3 should resolve completely, and the signing path is protected either way:
 * `canIssue()` refuses any agreement with unresolved tokens, so a placeholder can be *read*
 * but never *signed* around.
 *
 * It lives here, next to the version it applies to, because the reader, the PDF and
 * whoever computes the hash must all pass the same object. It used to be exported from
 * `AgreementReader.tsx`, which was fine while the browser was the only thing that
 * hashed: the server computes the hash now, and a constant inside a `"use client"` React
 * component is not something the server can import. A second copy with a different
 * placeholder string would produce two hashes for one document and no way to tell which one
 * a signature attested to.
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
