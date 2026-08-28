import { describe, it, expect } from "vitest";
import {
  MissingAgreementFieldError,
  canIssue,
  collectBlockers,
  collectTokens,
  findUnresolvedTokens,
  fingerprint,
  renderPlainText,
  renderText,
  sha256Hex,
} from "@shared/agreement/render";
import { AGREEMENT_V2_3 } from "@shared/agreement/v2_3";
import { GOLDEN_V2_3 } from "@shared/agreement/goldenVector";
import type { Agreement, Block, Blocker } from "@shared/agreement/types";

/**
 * The renderer, on its own terms.
 *
 * These are properties of `render.ts` rather than of any document: token substitution,
 * the missing-token policies, determinism, and how markers are collected and ordered.
 * They used to live in v2.1's and v2.2's suites, which is why they went when those
 * versions were deleted (§22) — and they are the more important half of that coverage,
 * because the renderer is what every stored fingerprint depends on.
 *
 * Where a document is needed it is either v2.3 or a synthetic three-line one. A synthetic
 * one is the only way to test a case the issued document deliberately does not contain —
 * a `blocks-send` marker, for instance, which is precisely what `canIssue` exists to
 * refuse and what 2.3 has none of.
 */

const FIXTURE = GOLDEN_V2_3.fields;

/** A document small enough to reason about, shaped like a real one. */
function agreementOf(blocks: Block[]): Agreement {
  return {
    version: "0.0-test",
    title: "TEST AGREEMENT",
    subtitle: "MUSCLEBOXPRO",
    runningFooter: "Test | Version 0.0-test",
    cover: [],
    sections: [{ number: "1", heading: "TERMS", blocks }],
    schedules: [],
  };
}

describe("token substitution", () => {
  it("resolves nested dotted paths", () => {
    expect(renderText("Email: {{gymNotices.email}}", FIXTURE)).toBe(
      "Email: owner@irontemple.example",
    );
  });

  it("throws rather than emit a contract containing a literal token", () => {
    // The default policy, and the right one everywhere except the reader: a document with
    // `{{securityDeposit}}` printed in it states no deposit at all.
    expect(() => renderText("Deposit {{securityDeposit}}", {})).toThrow(
      MissingAgreementFieldError,
    );
  });

  it("substitutes a visible blank in preview mode", () => {
    expect(renderText("Deposit {{securityDeposit}}", {}, { onMissing: "placeholder" })).toBe(
      "Deposit __________",
    );
  });

  it("names the tokens a set of fields cannot satisfy, and only those", () => {
    const agreement = agreementOf([
      { kind: "clause", number: "1.1", text: "Paid by {{gymLegalName}} of {{gymNotices.address}}." },
      { kind: "paragraph", text: "Deposit {{securityDeposit}}." },
    ]);

    expect(collectTokens(agreement)).toEqual([
      "gymLegalName",
      "gymNotices.address",
      "securityDeposit",
    ]);
    expect(findUnresolvedTokens(agreement, { gymLegalName: "Iron Temple LLP" })).toEqual([
      "gymNotices.address",
      "securityDeposit",
    ]);
    expect(findUnresolvedTokens(AGREEMENT_V2_3, FIXTURE)).toEqual([]);
  });
});

describe("plain-text rendering and hashing", () => {
  it("is byte-identical across repeated renders", () => {
    // Nothing in the output may depend on iteration order, a clock or a locale, or two
    // renderings of one record would hash differently and neither would be evidence.
    expect(renderPlainText(AGREEMENT_V2_3, FIXTURE)).toBe(
      renderPlainText(AGREEMENT_V2_3, FIXTURE),
    );
  });

  it("changes the hash when a gym's values change", async () => {
    const a = await sha256Hex(renderPlainText(AGREEMENT_V2_3, FIXTURE));
    const b = await sha256Hex(
      renderPlainText(AGREEMENT_V2_3, { ...FIXTURE, gymLegalName: "Other Gym LLP" }),
    );
    expect(a).not.toBe(b);
  });

  it("refuses to fingerprint a half-substituted contract", async () => {
    // `fingerprint` renders with the throwing policy whatever the reader is doing, so a
    // hash can never be taken over a document with a hole in it.
    await expect(
      fingerprint(AGREEMENT_V2_3, { ...FIXTURE, securityDeposit: undefined as never }),
    ).rejects.toThrow(MissingAgreementFieldError);
  });

  it("leaves todo markers out of the hashed text", () => {
    // A todo describes the document; it is not a term of it. If markers were hashed,
    // resolving a cosmetic transcription note would invalidate every signature taken
    // against clauses that never changed.
    const agreement = agreementOf([
      { kind: "clause", number: "1.1", text: "The Gym shall pay the deposit." },
      {
        kind: "todo",
        id: "unreviewed",
        severity: "needs-review",
        problem: "The deposit clause has not been read by counsel.",
        resolution: "Have counsel read it.",
      },
    ]);
    const text = renderPlainText(agreement, FIXTURE);

    expect(text).toContain("The Gym shall pay the deposit.");
    expect(text).not.toContain("read by counsel");
    expect(text).not.toContain("Have counsel read it.");
  });
});

describe("markers and issuability", () => {
  it("refuses to issue a document carrying a blocks-send marker", () => {
    const agreement = agreementOf([
      { kind: "clause", number: "1.1", text: "The Gym shall pay {{securityDeposit}}." },
      {
        kind: "todo",
        id: "amount-unknown",
        severity: "blocks-send",
        problem: "The source document leaves the amount of the deposit blank.",
        resolution: "Settle the amount and transcribe it.",
      },
    ]);

    const check = canIssue(agreement, FIXTURE);
    expect(check.ok).toBe(false);
    if (check.ok) throw new Error("unreachable");
    expect(check.blockers.map((b) => b.id)).toEqual(["amount-unknown"]);
  });

  it("refuses to issue a document with a token nothing satisfies", () => {
    const agreement = agreementOf([
      { kind: "clause", number: "1.1", text: "The Gym shall pay {{securityDeposit}}." },
    ]);
    expect(canIssue(agreement, {}).ok).toBe(false);
    expect(canIssue(agreement, FIXTURE).ok).toBe(true);
  });

  it("sorts blockers with blocks-send first, then needs-review, then cosmetic", () => {
    // The list is read top-down by whoever has to clear it, and it is what the internal
    // panel on step 3 prints, so the order is the priority.
    const marker = (id: string, severity: Blocker["severity"]): Block => ({
      kind: "todo",
      id,
      severity,
      problem: `${id} problem`,
      resolution: `${id} resolution`,
    });
    const agreement = agreementOf([
      marker("c", "cosmetic"),
      marker("b", "needs-review"),
      marker("a", "blocks-send"),
    ]);

    expect(collectBlockers(agreement).map((b) => b.id)).toEqual(["a", "b", "c"]);
  });

  it("reports the section a marker sits in, so it can be linked to", () => {
    const agreement = agreementOf([
      {
        kind: "todo",
        id: "somewhere",
        severity: "cosmetic",
        problem: "A stray character survived transcription.",
        resolution: "Remove it.",
      },
    ]);
    expect(collectBlockers(agreement)[0].location).toBe("1");
  });
});
