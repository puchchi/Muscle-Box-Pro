/**
 * Rendering, validation and hashing for versioned agreements.
 *
 * Three consumers read the same `Agreement` tree through this module:
 *
 *   1. the React reader in onboarding step 3   → walks blocks directly, using
 *                                                `renderText` per string
 *   2. the PDF builder                          → same, different output target
 *   3. the signature record                     → `renderPlainText` + `sha256Hex`
 *
 * (3) is the reason this file is careful. The hash stored with a signature is the
 * only evidence of *what* was signed. It must be a pure function of the version,
 * the content and the gym's substituted values — no dates, no locale, no map
 * iteration order, nothing that varies between the browser that produced it and
 * the server that later verifies it.
 *
 * See docs/gym-onboarding.md §12.
 */

import type { Agreement, AgreementFields, Block, Blocker, Section } from "./types";

/** `{{gymLegalName}}` or `{{gymNotices.email}}`. Whitespace inside the braces is tolerated. */
const TOKEN = /\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g;

export type RenderOptions = {
  /**
   * What to do with a token that has no value in `fields`.
   *
   * `throw` (the default) is correct everywhere that matters — a PDF or a hashed
   * plain-text rendering containing a literal `{{securityDeposit}}` is a broken
   * contract, and failing loudly at render time is the cheapest place to catch it.
   *
   * `placeholder` is for the read-only preview a gym sees before its details are
   * confirmed, where blanks are expected. Never use it on a signing path.
   */
  onMissing?: "throw" | "placeholder";
  /** Substituted for missing tokens when `onMissing` is `placeholder`. */
  placeholder?: string;
};

export class MissingAgreementFieldError extends Error {
  constructor(readonly token: string) {
    super(
      `Agreement template references {{${token}}} but no such value was supplied. ` +
        `Add it to AgreementFields, or fix the token.`,
    );
    this.name = "MissingAgreementFieldError";
  }
}

/** Resolves a dotted path against `fields`. Returns undefined for anything non-scalar. */
function lookup(fields: Partial<AgreementFields>, path: string): string | undefined {
  const value = path
    .split(".")
    .reduce<unknown>(
      (acc, key) =>
        acc !== null && typeof acc === "object" ? (acc as Record<string, unknown>)[key] : undefined,
      fields,
    );
  // A number would be a schema mistake rather than a value to coerce — the field
  // type is string precisely so that "₹50,000" and "24" format at the source.
  return typeof value === "string" ? value : undefined;
}

/** `"Term: {{termMonths}} months"` → `"Term: 24 months"`. */
export function renderText(
  template: string,
  fields: Partial<AgreementFields>,
  options: RenderOptions = {},
): string {
  const { onMissing = "throw", placeholder = "__________" } = options;
  return template.replace(TOKEN, (_match, token: string) => {
    const value = lookup(fields, token);
    if (value !== undefined) return value;
    if (onMissing === "placeholder") return placeholder;
    throw new MissingAgreementFieldError(token);
  });
}

/** Every distinct token the document uses, in first-appearance order. */
export function collectTokens(agreement: Agreement): string[] {
  const seen: string[] = [];
  for (const text of allStrings(agreement)) {
    for (const match of text.matchAll(TOKEN)) {
      if (!seen.includes(match[1])) seen.push(match[1]);
    }
  }
  return seen;
}

/**
 * Tokens the document uses that `fields` cannot satisfy.
 *
 * Call this before issuing, not after. It is the check that catches a clause
 * added in v2_2 whose token nobody wired into `AgreementFields`.
 */
export function findUnresolvedTokens(
  agreement: Agreement,
  fields: Partial<AgreementFields>,
): string[] {
  return collectTokens(agreement).filter((token) => lookup(fields, token) === undefined);
}

// ── Blockers ────────────────────────────────────────────────────────────────

const SEVERITY_ORDER = { "blocks-send": 0, "needs-review": 1, cosmetic: 2 } as const;

/**
 * Every `todo` marker in the document, derived by walking the tree.
 *
 * Deliberately not a hand-maintained list beside the content: a checklist that
 * has to be updated in step with the clauses is a checklist that goes stale, and
 * the failure mode is silently issuing an agreement with a hole in it.
 */
export function collectBlockers(agreement: Agreement): Blocker[] {
  const found: Blocker[] = [];

  const walk = (blocks: Block[], location: string) => {
    for (const block of blocks) {
      if (block.kind === "todo") {
        found.push({
          id: block.id,
          severity: block.severity,
          problem: block.problem,
          resolution: block.resolution,
          location,
        });
      }
    }
  };

  walk(agreement.cover, "Cover");
  for (const section of [...agreement.sections, ...agreement.schedules]) {
    walk(section.blocks, section.number);
  }

  // Sort by severity so a caller rendering the list leads with what blocks
  // sending. Stable within a severity, so document order is preserved.
  return found.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
}

export type IssueCheck =
  | { ok: true }
  | { ok: false; reasons: string[]; blockers: Blocker[]; unresolvedTokens: string[] };

/**
 * Whether this agreement may be sent to a gym for signature.
 *
 * Fails on any `blocks-send` marker or any token the supplied fields cannot fill.
 * `needs-review` and `cosmetic` markers do not block — they are for the internal
 * banner — because otherwise nothing would ever ship, and the distinction is the
 * whole point of the severity field.
 *
 * Callers must treat `ok: false` as a hard stop in production, not a warning.
 */
export function canIssue(agreement: Agreement, fields: Partial<AgreementFields>): IssueCheck {
  const blockers = collectBlockers(agreement).filter((b) => b.severity === "blocks-send");
  const unresolvedTokens = findUnresolvedTokens(agreement, fields);
  if (blockers.length === 0 && unresolvedTokens.length === 0) return { ok: true };

  const reasons = [
    ...blockers.map((b) => `${b.location}: ${b.problem}`),
    ...unresolvedTokens.map((t) => `Unresolved template field {{${t}}}`),
  ];
  return { ok: false, reasons, blockers, unresolvedTokens };
}

// ── Plain text ──────────────────────────────────────────────────────────────

/** Every user-visible string in the document, in document order. */
function* allStrings(agreement: Agreement): Generator<string> {
  const fromBlock = function* (block: Block): Generator<string> {
    switch (block.kind) {
      case "paragraph":
        yield block.text;
        break;
      case "clause":
        yield block.text;
        break;
      case "bullets":
      case "checklist":
        if (block.lead) yield block.lead;
        yield* block.items;
        break;
      case "table":
        yield* block.header;
        for (const row of block.rows) yield* row;
        break;
      case "callout":
        yield* block.lines;
        break;
      case "blanks":
        for (const blank of block.items) yield blank.label;
        break;
      case "signatures":
        for (const party of block.parties) {
          yield party.heading;
          if (party.lines) yield* party.lines;
          if (party.fields) yield* party.fields;
        }
        break;
      case "todo":
        // Intentionally not yielded. A todo is metadata about the document, not
        // content of it, so it must not affect the hash — otherwise resolving a
        // cosmetic marker would invalidate signatures taken against clauses that
        // never changed.
        break;
    }
  };

  for (const block of agreement.cover) yield* fromBlock(block);
  for (const section of [...agreement.sections, ...agreement.schedules]) {
    yield section.number;
    yield section.heading;
    for (const block of section.blocks) yield* fromBlock(block);
  }
}

function blockToLines(block: Block, fields: Partial<AgreementFields>, opts: RenderOptions): string[] {
  const r = (s: string) => renderText(s, fields, opts);
  switch (block.kind) {
    case "paragraph":
      return [r(block.text)];
    case "clause":
      // The trim matters: clause 6.1 has an empty body, and "6.1" is a different
      // string from "6.1 " for hashing purposes.
      return [`${block.number} ${r(block.text)}`.trim()];
    case "bullets":
      return [...(block.lead ? [r(block.lead)] : []), ...block.items.map((i) => `- ${r(i)}`)];
    case "checklist":
      return [...(block.lead ? [r(block.lead)] : []), ...block.items.map((i) => `[ ] ${r(i)}`)];
    case "table":
      return [
        block.header.map(r).join(" | "),
        ...block.rows.map((row) => row.map(r).join(" | ")),
      ];
    case "callout":
      return block.lines.map(r);
    case "blanks":
      return block.items.map((b) => `${r(b.label)}: ____________`);
    case "signatures":
      // A party with no `lines` emits exactly what it did before they existed, which is
      // what keeps v2.1's and v2.2's pinned hashes where they are.
      return block.parties.flatMap((p) => [
        r(p.heading),
        ...(p.lines ?? []).map(r),
        ...(p.fields ?? []).map((f) => `${r(f)}: ____`),
      ]);
    case "todo":
      // Excluded from the rendering for the same reason it is excluded from
      // `allStrings` — see the comment there.
      return [];
  }
}

function sectionToLines(
  section: Section,
  fields: Partial<AgreementFields>,
  opts: RenderOptions,
): string[] {
  return [
    `${section.number}. ${renderText(section.heading, fields, opts)}`,
    ...section.blocks.flatMap((b) => blockToLines(b, fields, opts)),
  ];
}

/**
 * The canonical plain-text form of the agreement — the thing that gets hashed.
 *
 * Deterministic by construction: no dates, no locale-dependent formatting, no
 * object-key iteration, no todo content. Given the same version and the same
 * fields it produces byte-identical output on any machine and in any runtime.
 *
 * Changing the *format* of this output changes every hash, so it is as frozen as
 * the agreement content itself. If a format change is ever unavoidable, version
 * the renderer alongside the agreement and store which one produced each hash.
 */
export function renderPlainText(
  agreement: Agreement,
  fields: Partial<AgreementFields>,
  options: RenderOptions = {},
): string {
  const lines = [
    agreement.subtitle,
    agreement.title,
    `Version ${agreement.version}`,
    ...agreement.cover.flatMap((b) => blockToLines(b, fields, options)),
    ...agreement.sections.flatMap((s) => sectionToLines(s, fields, options)),
    ...agreement.schedules.flatMap((s) => sectionToLines(s, fields, options)),
  ];
  // Single trailing newline, no blank-line separators, so whitespace tinkering in
  // the source data cannot move the hash.
  return `${lines.map((l) => l.trim()).join("\n")}\n`;
}

/**
 * SHA-256 as lowercase hex, via WebCrypto.
 *
 * `crypto.subtle` rather than node:crypto so the identical code runs in the
 * browser (where the gym signs), in Node (tests, PDF generation) and in a Deno
 * edge function (where the signature is verified). Three implementations of a
 * hash is three chances for them to disagree.
 */
export async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export type AgreementFingerprint = {
  version: string;
  /** SHA-256 of `renderPlainText`. Store this with the signature. */
  contentHash: string;
  /** Character length, as a cheap corruption check independent of the hash. */
  length: number;
};

/**
 * What to persist alongside a signature so the document can be proven later.
 *
 * Throws if any token is unfilled — a fingerprint of a half-substituted contract
 * would be worse than useless, because it would look like valid evidence.
 */
export async function fingerprint(
  agreement: Agreement,
  fields: AgreementFields,
): Promise<AgreementFingerprint> {
  const text = renderPlainText(agreement, fields, { onMissing: "throw" });
  return { version: agreement.version, contentHash: await sha256Hex(text), length: text.length };
}
