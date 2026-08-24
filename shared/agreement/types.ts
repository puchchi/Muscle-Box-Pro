/**
 * The document model for versioned legal agreements.
 *
 * The agreement is *data*, not markup, because one definition has to feed three
 * consumers that must never disagree: the React reader in onboarding step 3, the
 * PDF the gym receives, and the plain-text rendering that gets hashed and stored
 * alongside the signature. If those three could drift, a stored signature would
 * stop being evidence of what was agreed. See docs/gym-onboarding.md §12.
 *
 * Two rules for anyone editing an agreement module:
 *
 *   1. Never edit a version that has signatures against it. Add a new version.
 *   2. Never silently reword a clause. Where the source document is incomplete,
 *      emit a `todo` block — a contract that quietly omits a clause is worse
 *      than one that refuses to send.
 */

/** Tokens are `{{dotted.path}}` and resolved against `AgreementFields`. */
export type Blank = { label: string; width?: "short" | "long" };

export type Block =
  /** Body prose with no clause number of its own. */
  | { kind: "paragraph"; text: string }
  /** A numbered clause, e.g. `5.4`. */
  | { kind: "clause"; number: string; text: string }
  /** A bulleted list, optionally introduced by a lead-in line. */
  | { kind: "bullets"; lead?: string; items: string[] }
  /** A two-or-more column table. `header` is the column labels. */
  | { kind: "table"; header: string[]; rows: string[][] }
  /** A boxed emphasis block — used for the profit-share ratios and the deposit. */
  | { kind: "callout"; lines: string[] }
  /** A checklist rendered with checkboxes rather than bullets (Schedule A). */
  | { kind: "checklist"; lead?: string; items: string[] }
  /** Lines to be completed by hand on the printed copy. */
  | { kind: "blanks"; items: Blank[] }
  /**
   * Side-by-side execution blocks.
   *
   * `lines` are statements printed as text — a signatory's name, how the party executed.
   * `fields` are labels each followed by a rule to be completed by hand on a printed
   * copy. A party may carry either or both, and both are hashed: moving a name from a
   * blank rule into a printed line is a content change, so it needs a new version.
   */
  | {
      kind: "signatures";
      parties: { heading: string; lines?: string[]; fields?: string[] }[];
    }
  /**
   * Content that is missing or unresolved in the source document.
   *
   * `severity` decides what happens at runtime:
   *   - `blocks-send`  the agreement cannot be issued to a gym at all
   *   - `needs-review` legal counsel must sign off, but the text exists
   *   - `cosmetic`     a transcription or formatting defect only
   */
  | {
      kind: "todo";
      id: string;
      severity: "blocks-send" | "needs-review" | "cosmetic";
      /** What is wrong, in enough detail to act on without opening the PDF. */
      problem: string;
      /** What has to happen for this to clear. */
      resolution: string;
    };

export type Section = {
  /** `"6"`, `"6.1"`, or `"Schedule B"`. Used as a stable anchor id. */
  number: string;
  heading: string;
  blocks: Block[];
};

export type Agreement = {
  /**
   * Bump this for ANY content change. It is part of what gets hashed, and a
   * signature is only meaningful against a specific version.
   */
  version: string;
  title: string;
  subtitle: string;
  /** Rendered in the page footer of the PDF. */
  runningFooter: string;
  cover: Block[];
  sections: Section[];
  schedules: Section[];
};

/**
 * Per-gym values substituted into the template.
 *
 * Everything here comes from the gym's `gym_terms` / `gyms` rows, never from the
 * session token and never from `user_metadata`. Nested groups are addressed with
 * dotted tokens, e.g. `{{gymNotices.email}}`.
 */
export type AgreementFields = {
  gymLegalName: string;
  effectiveDate: string;
  machineModel: string;
  machineId: string;
  serialNumber: string;
  machineValue: string;
  installationDate: string;
  installationAddress: string;
  accessories: string;
  securityDeposit: string;
  /**
   * The same amount in words, e.g. `"Rupees Fifty Thousand Only"`.
   *
   * A separate field rather than something the template derives, because the template
   * is data and cannot call a function. Produced by `rupeesInWords()` from the same
   * `securityDepositInr` that `securityDeposit` is formatted from, so §5.1's figure and
   * its words come from one number and cannot disagree.
   */
  securityDepositInWords: string;
  termMonths: string;
  mbpNotices: { address: string; email: string; phone: string };
  gymNotices: { address: string; email: string; phone: string };
  signatoryName: string;
  signatoryDesignation: string;
};

export type Blocker = {
  id: string;
  severity: "blocks-send" | "needs-review" | "cosmetic";
  problem: string;
  resolution: string;
  /** Section number the marker sits in, for a "jump to it" link. */
  location: string;
};
