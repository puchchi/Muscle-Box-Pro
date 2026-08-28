/**
 * Pinned inputs and outputs for the agreement hash — the cross-repo drift guard.
 *
 * `mbp-backend` computes the `contentHash` it stores with a signature (see that repo's
 * `docs/gym-onboarding-api-design.md` §2.9). It does so by taking a **verbatim copy** of
 * `shared/agreement/` — `types.ts`, `render.ts`, `v2_3.ts` and this file — rather than
 * reimplementing the renderer, because the hash covers the rendered text a human read, and
 * two renderers agreeing on that byte for byte is not a property anyone can maintain by
 * inspection.
 *
 * A copy can still drift. This module is what turns drift into a failing unit test in
 * whichever repo drifted, instead of into a fingerprint that describes nothing: both suites
 * assert that the vector below still produces these exact bytes. A whitespace change
 * anywhere in the agreement tree or in `renderPlainText` fails immediately, on both sides,
 * in isolation.
 *
 * ───────────────────────────────────────────────────────────────────────────────
 * DO NOT UPDATE A HASH OR LENGTH HERE TO MAKE A FAILING TEST PASS.
 *
 * It pins the exact bytes a signature attests to. If it fails, either the agreement content
 * changed — in which case the change belongs in a new version file — or `renderPlainText`'s
 * format changed, which moves every fingerprint already stored. Both are things to stop and
 * think about. If it fails in only one of the two repos, that repo's copy has drifted and
 * the fix is to re-copy, not to re-pin.
 * ───────────────────────────────────────────────────────────────────────────────
 *
 * See docs/gym-onboarding.md §12 and §22.
 */

import type { Agreement, AgreementFields } from "./types";
import { fingerprint } from "./render";

export type AgreementGoldenVector = {
  /** The `Agreement.version` these values belong to. */
  version: string;
  /** Fixed inputs. NOT example values to be freshened — see the header. */
  fields: AgreementFields;
  /** SHA-256 of `renderPlainText(agreement, fields)`, lowercase hex. */
  contentHash: string;
  /** Character length of the same rendering — a corruption check independent of the hash. */
  length: number;
};

/**
 * The vector for 2.3 — the one version there is.
 *
 * `signatoryName` and `signatoryDesignation` are inputs to the pinned bytes: 2.3's §47
 * prints both, so changing `"A. Owner"` makes the hash below wrong.
 *
 * The machine identifiers and the installation date go the other way. 2.3 has no token for
 * any of them, so the three values here cannot affect this hash — they are present only
 * because `AgreementFields` requires them.
 *
 * A future version gets its **own** literal below this one, not a spread of this one with
 * overrides. Sharing a base means a value edited to suit the new vector silently moves this
 * hash too, and at that point the fix *looks* like "update the expected hash" — the one
 * thing a version with signatures against it may never do.
 */
export const GOLDEN_V2_3: AgreementGoldenVector = {
  version: "2.3",
  fields: {
    gymLegalName: "Iron Temple Fitness LLP",
    effectiveDate: "01 September 2026",
    machineModel: "MuscleBoxPro MBP-1",
    machineId: "MBP-0001",
    serialNumber: "SN-TEST-0001",
    machineValue: "₹4,50,000",
    installationDate: "05 September 2026",
    installationAddress: "12 MG Road, Bengaluru, Karnataka 560001",
    accessories: "Cup dispenser, water line kit",
    securityDeposit: "₹50,000",
    securityDepositInWords: "Rupees Fifty Thousand Only",
    termMonths: "24",
    mbpNotices: {
      address: "BlendBox Innovations LLP, Bengaluru",
      email: "legal@muscleboxpro.com",
      phone: "+91 00000 00000",
    },
    gymNotices: {
      address: "12 MG Road, Bengaluru, Karnataka 560001",
      email: "owner@irontemple.example",
      phone: "+91 11111 11111",
    },
    signatoryName: "A. Owner",
    signatoryDesignation: "Designated Partner",
  },
  contentHash: "085df8bf92f471792630691c2625057e05c898278ec74c3478bd70c611cb7b64",
  length: 38_306,
};

export type GoldenVectorVerdict =
  | { ok: true }
  | {
      ok: false;
      /** Human-readable, and deliberately says which side to fix. */
      problems: string[];
      actual: { version: string; contentHash: string; length: number };
    };

/**
 * Assert an `Agreement` still renders to its pinned bytes.
 *
 * Exported as a function rather than left to each suite's `expect` calls so the ported
 * copy in `mbp-backend` can run the identical check without depending on vitest — its
 * test is then one assertion against this verdict, and the two repos cannot disagree
 * about *what* is being compared, only about the answer.
 */
export async function verifyGoldenVector(
  agreement: Agreement,
  vector: AgreementGoldenVector,
): Promise<GoldenVectorVerdict> {
  const actual = await fingerprint(agreement, vector.fields);
  const problems: string[] = [];

  if (actual.version !== vector.version) {
    problems.push(`version is ${actual.version}, vector pins ${vector.version}`);
  }
  // Length first: it localises the drift. A differing length says content moved; an
  // identical length with a differing hash says the same number of characters changed,
  // which is nearly always a substitution rather than an edit.
  if (actual.length !== vector.length) {
    problems.push(`length is ${actual.length}, vector pins ${vector.length}`);
  }
  if (actual.contentHash !== vector.contentHash) {
    problems.push(`contentHash is ${actual.contentHash}, vector pins ${vector.contentHash}`);
  }

  return problems.length === 0 ? { ok: true } : { ok: false, problems, actual };
}
