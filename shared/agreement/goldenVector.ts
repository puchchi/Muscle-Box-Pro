/**
 * Pinned inputs and outputs for the agreement hash — the cross-repo drift guard.
 *
 * `mbp-backend` computes the `contentHash` that `POST /onboarding/sign` compares against
 * (see that repo's `docs/gym-onboarding-api-design.md` §2.9). It does so by taking a
 * **verbatim copy** of `shared/agreement/` — `types.ts`, `render.ts`, `v2_1.ts`, `v2_2.ts`, `v2_3.ts`
 * and this file — rather than reimplementing the renderer, because the hash covers the
 * rendered text a human read and two renderers agreeing on that byte for byte is not a
 * property anyone can maintain by inspection.
 *
 * A copy can still drift. This module is what turns drift into a failing unit test in
 * whichever repo drifted, instead of into a gym that cannot sign: both suites assert that
 * the vectors below still produce these exact bytes. A whitespace change anywhere in the
 * agreement tree or in `renderPlainText` fails immediately, on both sides, in isolation.
 *
 * ───────────────────────────────────────────────────────────────────────────────
 * DO NOT UPDATE A HASH OR LENGTH HERE TO MAKE A FAILING TEST PASS.
 *
 * These pin the exact bytes a signature against each version attests to. If one fails,
 * either the agreement content changed — in which case add the next version file rather
 * than editing a published one — or `renderPlainText`'s format changed, which invalidates every
 * signature already stored. Both are things to stop and think about. If it fails in only
 * one of the two repos, that repo's copy has drifted and the fix is to re-copy, not to
 * re-pin.
 * ───────────────────────────────────────────────────────────────────────────────
 *
 * See docs/gym-onboarding.md §12.
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
 * Each version gets its own literal, and they are deliberately not factored into a
 * shared base with per-version overrides.
 *
 * The values below happen to be identical, and the temptation to write
 * `{...BASE, termMonths: "36"}` is exactly the mistake: a value edited to suit a future
 * vector would move v2.1's, v2.2's and v2.3's hashes as a side effect, and the fix at that
 * point *looks* like "update the expected hash" — the one thing no version may do once
 * it has signatures. v2.3 is the live illustration: it is the first version to render
 * `signatoryName`, so a vector sharing one base would have made that name unchangeable in
 * three places at once for three different reasons. Duplication here buys independence, which is worth more than brevity
 * in a file whose whole job is to not move.
 */
export const GOLDEN_V2_1: AgreementGoldenVector = {
  version: "2.1",
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
    // v2.1 has no token for this — its §5.1 transcribes the words as fixed text, which
    // is the defect v2.2 fixes. Present because `AgreementFields` requires it; it does
    // not appear in v2.1's rendered bytes, so the hash below is unaffected.
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
  contentHash: "32e560ac088577008ff7af73f9cf4c1c4940ea4ff54a1e42301d1362374a75cf",
  length: 31_103,
};

export const GOLDEN_V2_2: AgreementGoldenVector = {
  version: "2.2",
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
      // Empty in production — see MBP_NOTICES. Populated here so the vector also proves
      // that v2.2 renders identically whether or not a phone number exists, which is what
      // makes dropping the channel a §41 drafting change rather than a data change.
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
  contentHash: "99a1394bd545d9e8f87666dfd4896cefa65c246ceffa5153f111a0a5b63152b0",
  length: 36_242,
};

/**
 * The vector for 2.3 — the version the flow issues.
 *
 * `signatoryName` and `signatoryDesignation` are load-bearing here for the first time.
 * Neither 2.1 nor 2.2 referenced them by any token, so the two values in the vectors above
 * are present only because `AgreementFields` requires them and cannot move those hashes.
 * 2.3's §47 prints both, so in this vector they are inputs to the pinned bytes: change
 * `"A. Owner"` and the hash below is wrong.
 *
 * The machine identifiers and the installation date go the other way. 2.3 has no token for
 * any of them, so the three values here cannot affect this hash — kept because the type
 * requires them, exactly as `securityDepositInWords` was kept in the 2.1 vector.
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
