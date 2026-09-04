import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * The admin panel's franchise seam.
 *
 * `adminApi.test.ts`'s brief, and the same division: `apiRequest` is mocked so what is under test is
 * this file's own judgement, and the **real** schema runs, because the property worth proving is that
 * a malformed response reaches the page as a distinguishable outcome with field paths rather than as
 * a generic failure.
 *
 * Two things here have no counterpart on the gym side, and they are the reason this suite exists:
 *
 * 1. **`api: "franchiseAdmin"` on every call.** These eleven routes are a different API. On
 *    `api.muscleboxpro.com` a missing target is a wrong base path and a 403 that reads like an
 *    undeployed route; in sandbox it is a request sent to the onboarding host entirely. Neither
 *    failure names the mistake, so each call asserts it.
 * 2. **The writes are schema-parsed too**, since they answer with the whole franchise record. A
 *    write whose response fails the schema must not read like a write that failed.
 * 3. **Three writes answer the record *and something else*,** and the something else is stripped by
 *    the view schema rather than rejected by it. `onboardingUrl` is the one that cannot be recovered
 *    once dropped, so the resend has a test whose whole subject is that the field survives.
 */

const { mockApiRequest } = vi.hoisted(() => ({ mockApiRequest: vi.fn() }));
vi.mock("@/lib/apiClient", () => ({ apiRequest: mockApiRequest }));

import {
  createFranchise,
  decideFranchise,
  fetchAdminFranchiseList,
  fetchAdminFranchiseView,
  fetchFranchiseApplications,
  patchFranchiseTerms,
  refuseFranchisePayment,
  resendFranchiseInvite,
  triageFranchiseApplication,
  verifyFranchisePayment,
  voidFranchiseInvite,
  ADMIN_FRANCHISES_QUERY_KEY,
  adminFranchiseQueryKey,
} from "@/lib/adminFranchiseApi";
import {
  adminFranchiseFixture,
  adminFranchiseListFixture,
  adminFranchiseReviewQueueFixture,
} from "@/test/adminFranchiseFixture";
import { franchiseApplicationPageFixture } from "@/test/franchiseApplicationsFixture";
import {
  adminFranchiseInviteFormSchema,
  inviteDefaults,
  toAdminFranchiseInviteBody,
} from "@shared/admin/franchiseInvite";
import {
  franchiseTriageFormSchema,
  toFranchiseTriageBody,
} from "@shared/admin/franchiseApplications";

const FRANCHISE_ID = "b7e2c1a4-9f38-4d6b-8e05-3c1f7a2d9b64";
const APPLICATION_ID = "a2d51c60-7e94-4b13-9f28-6c05a7e3b149";

function resolves(data: unknown) {
  mockApiRequest.mockResolvedValue({ ok: true, data });
}

function fails(code: string, message: string) {
  mockApiRequest.mockResolvedValue({ ok: false, error: { code, message } });
}

function method(): string {
  return mockApiRequest.mock.calls[0][0] as string;
}

function path(): string {
  return mockApiRequest.mock.calls[0][1] as string;
}

function options(): { api?: string; body?: unknown } {
  return mockApiRequest.mock.calls[0][2] as { api?: string; body?: unknown };
}

beforeEach(() => {
  mockApiRequest.mockReset();
});

describe("every route names the franchise admin API", () => {
  it("sends api: franchiseAdmin on all eleven calls, reads and writes alike", async () => {
    const calls: [string, () => Promise<unknown>][] = [
      ["list", () => fetchAdminFranchiseList()],
      ["view", () => fetchAdminFranchiseView(FRANCHISE_ID)],
      ["applications", () => fetchFranchiseApplications()],
      ["triage", () => triageFranchiseApplication(APPLICATION_ID, triageBody())],
      ["create", () => createFranchise(inviteBody())],
      [
        "approval",
        () => decideFranchise(FRANCHISE_ID, { outcome: "declined", internalReason: "Not now." }),
      ],
      ["verify", () => verifyFranchisePayment(FRANCHISE_ID, 1, { receivedPaise: 124_941_000 })],
      ["refuse", () => refuseFranchisePayment(FRANCHISE_ID, 1, { reason: "No such UTR." })],
      ["terms", () => patchFranchiseTerms(FRANCHISE_ID, { machineAllocation: 6 })],
      ["resend", () => resendFranchiseInvite(FRANCHISE_ID, { sendInvite: true })],
      ["void", () => voidFranchiseInvite(FRANCHISE_ID)],
    ];

    for (const [label, call] of calls) {
      mockApiRequest.mockReset();
      resolves(adminFranchiseFixture());
      await call();
      expect(options().api, label).toBe("franchiseAdmin");
    }
  });
});

describe("fetchAdminFranchiseList", () => {
  it("asks for the plain route when given no options", async () => {
    // No trailing "?", for `fetchAdminGymList`'s reason: an empty `?limit=` is a value the handler
    // would try to read.
    resolves(adminFranchiseListFixture());
    await fetchAdminFranchiseList();
    expect(method()).toBe("GET");
    expect(path()).toBe("/admin/franchises");
  });

  it("sends limit and cursor when given them", async () => {
    resolves(adminFranchiseListFixture());
    await fetchAdminFranchiseList({ limit: 25, cursor: "abc" });
    expect(path()).toBe("/admin/franchises?limit=25&cursor=abc");
  });

  it("escapes a cursor containing base64 padding", async () => {
    resolves(adminFranchiseListFixture());
    await fetchAdminFranchiseList({ cursor: "eyJwayI6IkZSK2EifQ==" });
    expect(path()).toBe("/admin/franchises?cursor=eyJwayI6IkZSK2EifQ%3D%3D");
    expect(path()).not.toContain("+");
  });

  it("asks for the review queue by query parameter, not by a second route", async () => {
    resolves(adminFranchiseReviewQueueFixture());
    await fetchAdminFranchiseList({ queue: "review" });
    expect(path()).toBe("/admin/franchises?queue=review");
  });

  it("sends both a cursor and queue=review rather than deciding which wins", async () => {
    // Which one the server honours is the server's rule — it reads `queue` and ignores `cursor`,
    // because the sparse index is unpaged. Resolving that here would be a second copy of the rule,
    // and it is the copy that would drift.
    resolves(adminFranchiseReviewQueueFixture());
    await fetchAdminFranchiseList({ queue: "review", cursor: "abc" });
    expect(path()).toBe("/admin/franchises?cursor=abc&queue=review");
  });

  it("returns the parsed page", async () => {
    resolves(adminFranchiseListFixture());
    const result = await fetchAdminFranchiseList();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.franchises).toHaveLength(3);
    expect(result.data.queue).toBeNull();
  });

  it("keeps queue: review off the page's paging, because the server sends no cursor with it", async () => {
    resolves(adminFranchiseReviewQueueFixture());
    const result = await fetchAdminFranchiseList({ queue: "review" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.queue).toBe("review");
    expect(result.data.nextCursor).toBeNull();
  });

  it("accepts a row whose legalEntityName is empty, which is every freshly invited franchise", async () => {
    // The invite only needs a trade name, so an empty legal name is the ordinary state of a row
    // rather than a malformed one. A schema that required it would blank the whole list.
    resolves(adminFranchiseListFixture());
    const result = await fetchAdminFranchiseList();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.franchises[1].legalEntityName).toBe("");
    expect(result.data.franchises[1].entityType).toBe("");
  });

  it("accepts a row whose tradeName is empty, which is an entity trading under its own name", async () => {
    // A real sandbox row on 2026-09-02, and it blanked the list: `tradeName` was the one identity
    // field still required to be non-empty here, while step 1 accepts a blank one and calls it an
    // answer. `franchiseNameOf` already falls back to the legal name, so there was never a screen
    // that needed this to be filled in.
    const list = adminFranchiseListFixture() as unknown as Record<string, any>;
    list.franchises[0].tradeName = "";
    resolves(list);
    const result = await fetchAdminFranchiseList();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.franchises[0].tradeName).toBe("");
  });

  it("reports a malformed page with the field paths that failed", async () => {
    const list = adminFranchiseListFixture() as unknown as Record<string, any>;
    list.franchises[0].status = "awaiting_review";
    resolves(list);
    const result = await fetchAdminFranchiseList();
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.join(" ")).toContain("franchises.0.status");
  });

  it("passes a transport failure through with an empty issues list", async () => {
    // The emptiness is what tells a transport failure apart from a schema failure at the call site.
    fails("network", "Could not reach the server.");
    const result = await fetchAdminFranchiseList();
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toBe("Could not reach the server.");
    expect(result.issues).toEqual([]);
  });
});

describe("fetchAdminFranchiseView", () => {
  it("asks for the franchise by id", async () => {
    resolves(adminFranchiseFixture());
    await fetchAdminFranchiseView(FRANCHISE_ID);
    expect(path()).toBe(`/admin/franchises/${FRANCHISE_ID}`);
  });

  it("escapes an id it was handed", async () => {
    // The id comes off the URL, so a crafted link must not reach a different route by putting a
    // slash in the segment.
    resolves(adminFranchiseFixture());
    await fetchAdminFranchiseView("../franchises");
    expect(path()).toBe("/admin/franchises/..%2Ffranchises");
  });

  it("returns the parsed franchise, proposal and grant both", async () => {
    resolves(adminFranchiseFixture());
    const result = await fetchAdminFranchiseView(FRANCHISE_ID);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.territory?.proposedDistricts).toHaveLength(5);
    expect(result.data.territory?.grantedTerritory).toBe("Maharashtra: Pune, Satara, Sangli");
  });

  it("accepts reviewStartedAt as null rather than requiring an instant", async () => {
    // Nothing writes it: `under_review` is a status with no timestamp behind it. The handler sends
    // the key as an explicit null, and a schema that demanded a date would fail every franchise.
    resolves(adminFranchiseFixture());
    const result = await fetchAdminFranchiseView(FRANCHISE_ID);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.timestamps.reviewStartedAt).toBeNull();
  });

  it("fails the parse when claimedAt arrives as epoch milliseconds", async () => {
    // The mismatch this schema caught for real: `FranchisePaymentClaim.claimedAt` is a number in
    // storage and an ISO instant on the wire, so a handler that spread the stored claim would put a
    // number on a field the page formats as a date. Pinned so a regression names the field instead
    // of rendering "Invalid Date".
    const franchise = adminFranchiseFixture() as unknown as Record<string, any>;
    franchise.payments[0].claim.claimedAt = 1_787_000_400_000;
    resolves(franchise);
    const result = await fetchAdminFranchiseView(FRANCHISE_ID);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.join(" ")).toContain("payments.0.claim.claimedAt");
  });

  it("reports a malformed franchise with the field path", async () => {
    const franchise = adminFranchiseFixture() as unknown as Record<string, any>;
    delete franchise.terms.investmentPaise;
    resolves(franchise);
    const result = await fetchAdminFranchiseView(FRANCHISE_ID);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.join(" ")).toContain("terms.investmentPaise");
  });

  it("passes a missing franchise through as the transport error it arrives as", async () => {
    // A 404 on this API arrives as `invalid_handle`, not `invalid_token`: the franchise routes have
    // their own error vocabulary. The message is the server's and says the right thing.
    fails("invalid_handle", "That franchise could not be found.");
    const result = await fetchAdminFranchiseView("nope");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("invalid_handle");
    expect(result.issues).toEqual([]);
  });
});

function triageBody() {
  return toFranchiseTriageBody(
    franchiseTriageFormSchema.parse({ status: "reviewed", note: "Spoke on 24 Aug." }),
  );
}

describe("fetchFranchiseApplications", () => {
  it("asks for the plain route when given no filter", async () => {
    resolves(franchiseApplicationPageFixture());
    await fetchFranchiseApplications();
    expect(method()).toBe("GET");
    expect(path()).toBe("/admin/franchise-applications");
  });

  it("sends the status as a query parameter, because the filter is a server read", async () => {
    // Not a narrowing of what is already on screen: `new` means *no triage row at all*, which only the
    // join can decide. The chips on the screen therefore carry no counts.
    resolves(franchiseApplicationPageFixture());
    await fetchFranchiseApplications({ status: "new", limit: 100 });
    expect(path()).toBe("/admin/franchise-applications?limit=100&status=new");
  });

  it("returns the parsed page, triage and all", async () => {
    resolves(franchiseApplicationPageFixture());
    const result = await fetchFranchiseApplications();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.applications).toHaveLength(4);
    expect(result.data.applications[0].triage).toBeNull();
    expect(result.data.applications[3].triage?.franchiseId).toBe(FRANCHISE_ID);
  });

  it("reports a malformed page with the field paths that failed", async () => {
    const page = franchiseApplicationPageFixture() as unknown as Record<string, any>;
    page.applications[0].status = "untriaged";
    resolves(page);
    const result = await fetchFranchiseApplications();
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toContain("franchise enquiries");
    expect(result.issues.join(" ")).toContain("applications.0.status");
  });

  it("passes a refused status through as the validation error it arrives as", async () => {
    // Unlike `limit`, a bad `status` is refused rather than clamped: answering with every application to
    // a request that asked for the rejected ones would have an admin acting on rows they filtered out.
    fails("validation", "Must be one of new, reviewed, rejected, converted.");
    const result = await fetchFranchiseApplications();
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("validation");
    expect(result.issues).toEqual([]);
  });
});

describe("triageFranchiseApplication", () => {
  it("patches the application by id", async () => {
    resolves(triageResult());
    await triageFranchiseApplication(APPLICATION_ID, triageBody());
    expect(method()).toBe("PATCH");
    expect(path()).toBe(`/admin/franchise-applications/${APPLICATION_ID}`);
    expect(options().body).toEqual({ status: "reviewed", note: "Spoke on 24 Aug." });
  });

  it("escapes an id it was handed", async () => {
    resolves(triageResult());
    await triageFranchiseApplication("../franchises", triageBody());
    expect(path()).toBe("/admin/franchise-applications/..%2Ffranchises");
  });

  it("returns the decision, unparsed", async () => {
    // Six flat fields, and the screen refetches the list rather than patching a row out of them: `status`
    // is derived from the join, and only the server can do that.
    resolves(triageResult());
    const result = await triageFranchiseApplication(APPLICATION_ID, triageBody());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.decidedByEmail).toBe("anurag@muscleboxpro.com");
  });

  it("passes a 409 through with the server's message, which has one meaning", async () => {
    // The route's only condition is `attribute_not_exists(franchiseId)`, in the write rather than in a
    // read-then-check, so a conflict here means a franchise already exists and the row is terminal.
    fails("wrong_step", "A franchise has already been created from this application.");
    const result = await triageFranchiseApplication(APPLICATION_ID, triageBody());
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toContain("already been created");
  });
});

function triageResult() {
  return {
    applicationId: APPLICATION_ID,
    reference: "MBP-FR-A2D51C607E",
    status: "reviewed",
    note: "Spoke on 24 Aug.",
    decidedByEmail: "anurag@muscleboxpro.com",
    decidedAt: "2026-08-24T09:15:00.000Z",
  };
}

/** A valid invite body, through the form schema the caller is trusted to have run. */
function inviteBody() {
  const form = adminFranchiseInviteFormSchema.parse({
    ...inviteDefaults("territory"),
    legalEntityName: "Coastline Wellness LLP",
    tradeName: "Coastline Wellness",
    entityType: "llp",
    noticesEmail: "founder@coastlinewellness.co.in",
    noticesPhone: "+919845220017",
  });
  return toAdminFranchiseInviteBody(form);
}

describe("createFranchise", () => {
  it("posts the wire body, in paise", async () => {
    // ₹25,00,000 as 250000000. The form holds rupees because nobody types the paise figure, and
    // this is the seam that must send the multiplied one.
    resolves(inviteResult());
    await createFranchise(inviteBody());
    expect(method()).toBe("POST");
    expect(path()).toBe("/admin/franchises");
    expect(options().body).toMatchObject({ tier: "territory", investmentPaise: 250_000_000 });
  });

  it("returns the link, unparsed", async () => {
    // Deliberately not schema-checked: six flat fields, and the screen shows `onboardingUrl` once.
    resolves(inviteResult());
    const result = await createFranchise(inviteBody());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.onboardingUrl).toContain("/franchise/onboarding/");
    expect(result.data.emailed).toBe(true);
  });

  it("reports a failed delivery as a created franchise, not as an error", async () => {
    // `emailed: false` on an otherwise successful call. Nothing can reissue the handle this call
    // consumed, so a mail failure has to arrive next to a URL the admin can still copy.
    resolves({ ...inviteResult(), emailed: false });
    const result = await createFranchise(inviteBody());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.emailed).toBe(false);
    expect(result.data.onboardingUrl).toBeTruthy();
  });

  it("surfaces the handler's flat field errors", async () => {
    // Flat, unlike `POST /admin/gyms`, which namespaces them. `investmentPaise` is the one key that
    // names no field on the form, which is what `INVITE_FIELD_FOR_WIRE` exists to map.
    mockApiRequest.mockResolvedValue({
      ok: false,
      error: {
        code: "validation",
        message: "Some fields need fixing.",
        fieldErrors: {
          investmentPaise: "Whole paise only, so ₹12,50,000 is 125000000.",
          noticesEmail: "That does not look like an email address.",
        },
      },
    });
    const result = await createFranchise(inviteBody());
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.fieldErrors).toEqual({
      investmentPaise: "Whole paise only, so ₹12,50,000 is 125000000.",
      noticesEmail: "That does not look like an email address.",
    });
  });
});

function inviteResult() {
  return {
    franchiseId: FRANCHISE_ID,
    slug: "coastline-wellness",
    onboardingUrl:
      "https://muscleboxpro.com/franchise/onboarding/coastline-wellness/3f7c9a1e5b2d4068a5c3e7f9b2d4068a",
    tokenId: "e5147c02-8b6a-4d93-9f21-3c70a5e8b146",
    expiresAt: "2026-09-30T05:12:00.000Z",
    emailed: true,
  };
}

describe("decideFranchise", () => {
  it("posts an approval with the granted territory, which is not the proposal", async () => {
    resolves(adminFranchiseFixture());
    await decideFranchise(FRANCHISE_ID, {
      outcome: "approved",
      grantedTerritory: "Maharashtra: Pune, Satara, Sangli",
      grantedBoundary: "Three districts in full.",
      grantedExclusions: "",
      grantedTier: null,
      internalReason: "Funding evidence is thin for five districts.",
    });
    expect(path()).toBe(`/admin/franchises/${FRANCHISE_ID}/approval`);
    expect(options().body).toEqual({
      outcome: "approved",
      grantedTerritory: "Maharashtra: Pune, Satara, Sangli",
      grantedBoundary: "Three districts in full.",
      // Empty is a real answer: nothing is carved out. Not dropped, because an absent key and "we
      // excluded nothing" are different claims about the same grant.
      grantedExclusions: "",
      // Null keeps the tier the franchisee proposed.
      grantedTier: null,
      internalReason: "Funding evidence is thin for five districts.",
    });
  });

  it("posts a hold with the outstanding list, to the same route", async () => {
    resolves(adminFranchiseFixture());
    await decideFranchise(FRANCHISE_ID, {
      outcome: "on_hold",
      outstanding: ["A full LLP agreement", "Bank statements for the last quarter"],
      contactName: "Anurag",
      internalReason: "Partial entity proof.",
    });
    expect(path()).toBe(`/admin/franchises/${FRANCHISE_ID}/approval`);
    expect(options().body).toMatchObject({ outcome: "on_hold", contactName: "Anurag" });
  });

  it("posts a decline carrying only our own reason", async () => {
    // §3: the franchisee is shown no reason at all, so there is no franchisee-facing field on this
    // branch for one to leak through.
    resolves(adminFranchiseFixture());
    await decideFranchise(FRANCHISE_ID, { outcome: "declined", internalReason: "Territory taken." });
    expect(options().body).toEqual({ outcome: "declined", internalReason: "Territory taken." });
  });

  it("returns the franchise the write answered with", async () => {
    resolves(adminFranchiseFixture());
    const result = await decideFranchise(FRANCHISE_ID, {
      outcome: "declined",
      internalReason: "Territory taken.",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.approval?.outcome).toBe("approved");
  });

  it("says the change may have landed when the response fails the schema", async () => {
    // The distinction the page acts on: a write that failed can be retried, and a write whose
    // *response* was unreadable cannot, because a second approval is refused by the server.
    const franchise = adminFranchiseFixture() as unknown as Record<string, any>;
    franchise.approval.outcome = "rejected";
    resolves(franchise);
    const result = await decideFranchise(FRANCHISE_ID, {
      outcome: "declined",
      internalReason: "Territory taken.",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toContain("may have been saved");
    expect(result.issues.join(" ")).toContain("approval.outcome");
  });

  it("does not claim a write landed when the transport failed", async () => {
    fails("wrong_step", "This franchise has already been decided.");
    const result = await decideFranchise(FRANCHISE_ID, {
      outcome: "declined",
      internalReason: "Territory taken.",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toBe("This franchise has already been decided.");
    expect(result.error.message).not.toContain("may have been saved");
  });
});

describe("the two payment decisions", () => {
  it("puts the instalment number in the path and the amount in the body", async () => {
    resolves(adminFranchiseFixture());
    await verifyFranchisePayment(FRANCHISE_ID, 1, { receivedPaise: 124_941_000 });
    expect(path()).toBe(`/admin/franchises/${FRANCHISE_ID}/payments/1/verify`);
    // What arrived, not what was expected. The two differing is ordinary (§7.3).
    expect(options().body).toEqual({ receivedPaise: 124_941_000 });
  });

  it("sends a refusal to its own route, with the reason the franchisee is shown", async () => {
    resolves(adminFranchiseFixture());
    await refuseFranchisePayment(FRANCHISE_ID, 2, { reason: "We could not find that UTR." });
    expect(path()).toBe(`/admin/franchises/${FRANCHISE_ID}/payments/2/refuse`);
    expect(options().body).toEqual({ reason: "We could not find that UTR." });
  });

  it("escapes the franchise id but leaves the instalment number bare", async () => {
    // `instalmentNo` is a number, so there is nothing in it to escape; the handler answers 404 for a
    // segment that does not parse. The id is the attacker-influenced half.
    resolves(adminFranchiseFixture());
    await verifyFranchisePayment("a/b", 3, { receivedPaise: 1 });
    expect(path()).toBe("/admin/franchises/a%2Fb/payments/3/verify");
  });

  it("carries a schema failure after a payment write with the same warning", async () => {
    const franchise = adminFranchiseFixture() as unknown as Record<string, any>;
    franchise.payments[0].expectedPaise = "125000000";
    resolves(franchise);
    const result = await verifyFranchisePayment(FRANCHISE_ID, 1, { receivedPaise: 124_941_000 });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toContain("may have been saved");
    expect(result.issues.join(" ")).toContain("payments.0.expectedPaise");
  });
});

describe("patchFranchiseTerms", () => {
  it("patches only the keys it was given, in paise", async () => {
    resolves(termsPatchResult(["investment", "machines"]));
    await patchFranchiseTerms(FRANCHISE_ID, {
      investmentPaise: 260_000_000,
      machineAllocation: 6,
    });
    expect(method()).toBe("PATCH");
    expect(path()).toBe(`/admin/franchises/${FRANCHISE_ID}/terms`);
    expect(options().body).toEqual({ investmentPaise: 260_000_000, machineAllocation: 6 });
  });

  it("sends null for a cleared figure rather than omitting it", async () => {
    // Omitting means "leave it alone" and null means "not agreed". The second makes the franchise
    // unissuable, which is the point of choosing it.
    resolves(termsPatchResult(["capital recovery threshold"]));
    await patchFranchiseTerms(FRANCHISE_ID, { capitalRecoveryPaise: null, paymentSchedule: null });
    expect(options().body).toEqual({ capitalRecoveryPaise: null, paymentSchedule: null });
  });

  it("keeps `changed` off the response, which the view schema would have stripped", async () => {
    // The whole reason this route has a parse of its own. `franchisesSchema.ts` is plain
    // `z.object()`s, so the shared view parser answers `ok: true` and hands back a record with no
    // `changed` on it, and the screen then reports "0 terms changed" after a successful save.
    resolves(termsPatchResult(["investment", "instalment schedule"]));
    const result = await patchFranchiseTerms(FRANCHISE_ID, { investmentPaise: 260_000_000 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.changed).toEqual(["investment", "instalment schedule"]);
    expect(result.data.franchiseId).toBe(FRANCHISE_ID);
  });

  it("fails the parse when `changed` is missing entirely", async () => {
    resolves(adminFranchiseFixture());
    const result = await patchFranchiseTerms(FRANCHISE_ID, { machineAllocation: 6 });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toContain("may have been saved");
    expect(result.issues.join(" ")).toContain("changed");
  });

  it("passes a refusal after signing through as the server's own words", async () => {
    // `conflict()` uses one code for several refusals, so the message is the only thing telling
    // `already_signed` apart from the rest.
    fails("wrong_step", "These terms have been signed and can no longer be changed.");
    const result = await patchFranchiseTerms(FRANCHISE_ID, { machineAllocation: 6 });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toBe("These terms have been signed and can no longer be changed.");
    expect(result.error.message).not.toContain("may have been saved");
  });

  it("carries the route's field error for tier, which names no input on the form", async () => {
    mockApiRequest.mockResolvedValue({
      ok: false,
      error: {
        code: "validation",
        message: "Some fields need fixing.",
        fieldErrors: { tier: "The tier is set with the territory grant, not here." },
      },
    });
    const result = await patchFranchiseTerms(FRANCHISE_ID, { machineAllocation: 6 });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.fieldErrors?.tier).toContain("territory grant");
  });
});

describe("resendFranchiseInvite", () => {
  it("posts to the invite route with the name and the mail choice", async () => {
    resolves(resendResult());
    await resendFranchiseInvite(FRANCHISE_ID, { invitedByName: "Anurag", sendInvite: true });
    expect(method()).toBe("POST");
    expect(path()).toBe(`/admin/franchises/${FRANCHISE_ID}/invite`);
    expect(options().body).toEqual({ invitedByName: "Anurag", sendInvite: true });
  });

  it("omits invitedByName so the server inherits it from the token being superseded", async () => {
    // Blank is the ordinary case: the name is the franchisee's named contact through a months-long
    // onboarding, and a colleague clicking resend must not silently become that contact.
    resolves(resendResult());
    await resendFranchiseInvite(FRANCHISE_ID, { sendInvite: false });
    expect(options().body).toEqual({ sendInvite: false });
  });

  it("keeps onboardingUrl on the response, which is the only copy that will ever exist", async () => {
    // The test this file exists for. The server stores `sha256(handle)` and no handle, so a parse
    // that stripped this field would leave the franchisee with a dead link and no replacement.
    resolves(resendResult());
    const result = await resendFranchiseInvite(FRANCHISE_ID, { sendInvite: true });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.onboardingUrl).toContain("/franchise/onboarding/");
    expect(result.data.expiresAt).toBe("2026-10-04T05:12:00.000Z");
    expect(result.data.emailed).toBe(true);
  });

  it("reports a minted link whose mail failed as a success carrying the reason", async () => {
    resolves({ ...resendResult(), emailed: false, emailReason: "SES rejected the recipient." });
    const result = await resendFranchiseInvite(FRANCHISE_ID, { sendInvite: true });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.emailed).toBe(false);
    expect(result.data.emailReason).toBe("SES rejected the recipient.");
    expect(result.data.onboardingUrl).toBeTruthy();
  });

  it("says the link cannot be recovered when the response fails the schema", async () => {
    // Not "reload before trying again", which is what every other write says: a resend that landed
    // and then failed to parse has revoked the working link and thrown away its replacement.
    const body = resendResult() as unknown as Record<string, any>;
    delete body.onboardingUrl;
    resolves(body);
    const result = await resendFranchiseInvite(FRANCHISE_ID, { sendInvite: true });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toContain("cannot be recovered");
    expect(result.issues.join(" ")).toContain("onboardingUrl");
  });

  it("fails the parse when onboardingUrl arrives as a bare handle rather than a URL", async () => {
    // A relative path would render in the copy box and be unusable, and an admin has no second
    // chance to notice. `z.string().url()` is deliberately stricter than the field's own type.
    resolves({ ...resendResult(), onboardingUrl: "/franchise/onboarding/northline-nutrition/3f7c" });
    const result = await resendFranchiseInvite(FRANCHISE_ID, { sendInvite: true });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.join(" ")).toContain("onboardingUrl");
  });
});

describe("voidFranchiseInvite", () => {
  it("deletes the invite route and sends no body of its own", async () => {
    // `apiRequest` supplies `Content-Type: application/json` and `{}` on every non-GET, which this
    // route requires. There is nothing for the caller to add.
    resolves({ ...adminFranchiseFixture(), wasLive: true });
    await voidFranchiseInvite(FRANCHISE_ID);
    expect(method()).toBe("DELETE");
    expect(path()).toBe(`/admin/franchises/${FRANCHISE_ID}/invite`);
    expect(options().body).toBeUndefined();
  });

  it("reports a revoked link", async () => {
    resolves({ ...adminFranchiseFixture(), wasLive: true });
    const result = await voidFranchiseInvite(FRANCHISE_ID);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.wasLive).toBe(true);
  });

  it("reports wasLive: false as a success, not as an error", async () => {
    // A franchise created before the server began storing the token pointer has a working link we
    // cannot address. That is the honest outcome and the admin needs to be told the exposure is
    // still open, which a thrown error would not do.
    resolves({ ...adminFranchiseFixture(), wasLive: false });
    const result = await voidFranchiseInvite(FRANCHISE_ID);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.wasLive).toBe(false);
  });

  it("fails the parse when wasLive is missing, rather than reading it as false", async () => {
    resolves(adminFranchiseFixture());
    const result = await voidFranchiseInvite(FRANCHISE_ID);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.join(" ")).toContain("wasLive");
  });
});

function termsPatchResult(changed: string[]) {
  return { ...adminFranchiseFixture(), changed };
}

function resendResult() {
  return {
    ...adminFranchiseFixture(),
    onboardingUrl:
      "https://muscleboxpro.com/franchise/onboarding/northline-nutrition/7d1e4b93c2a86045f9b3e7c1a5d20468",
    tokenId: "1f93b8c4-52ea-4d07-9b16-8c40a5e71d29",
    expiresAt: "2026-10-04T05:12:00.000Z",
    emailed: true,
  };
}

describe("the query keys", () => {
  it("nest under the same admin prefix the gym keys use", () => {
    // `AdminShell.handleSignOut` removes `["admin"]` wholesale, which only works while every admin
    // key starts with it. This is what keeps one admin's franchise data out of the next admin's cache.
    expect(ADMIN_FRANCHISES_QUERY_KEY[0]).toBe("admin");
    expect(adminFranchiseQueryKey(FRANCHISE_ID)[0]).toBe("admin");
  });

  it("gives each franchise its own key, and does not collide with the gym keys", () => {
    expect(adminFranchiseQueryKey("a")).not.toEqual(adminFranchiseQueryKey("b"));
    expect(ADMIN_FRANCHISES_QUERY_KEY).not.toEqual(adminFranchiseQueryKey("a"));
  });
});
