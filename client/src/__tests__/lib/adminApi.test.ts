import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * The admin reads seam.
 *
 * Mocked at `apiRequest`, so what is under test is this file's own judgement: which URL it
 * builds, and what it does with a body. The transport is `apiClient.test.ts`'s job and the
 * schema is `admin-gyms-schema.test.ts`'s — the *real* schema runs here rather than a mock,
 * because the property worth proving is that a malformed response reaches the page as a
 * distinguishable outcome with field paths attached, not as a generic failure.
 *
 * The URL cases look trivial and are not. `?limit=` or a `+` in an unescaped cursor both
 * produce a working request that returns the wrong page, which reads as missing gyms rather
 * than as a bug — and a cursor is DynamoDB's `LastEvaluatedKey`, base64 with `+` and `=` in it.
 */

const { mockApiRequest } = vi.hoisted(() => ({ mockApiRequest: vi.fn() }));
vi.mock("@/lib/apiClient", () => ({ apiRequest: mockApiRequest }));

import {
  createGym,
  fetchAdminGymList,
  fetchAdminGymView,
  ADMIN_GYMS_QUERY_KEY,
  adminGymQueryKey,
} from "@/lib/adminApi";
import { adminGymFixture, adminGymListFixture } from "@/test/adminGymFixture";
import { toAdminInviteBody, type AdminInviteFormInput } from "@shared/admin/invite";

function resolves(data: unknown) {
  mockApiRequest.mockResolvedValue({ ok: true, data });
}

function fails(code: string, message: string) {
  mockApiRequest.mockResolvedValue({ ok: false, error: { code, message } });
}

/** The path of the first call. */
function path(): string {
  return mockApiRequest.mock.calls[0][1] as string;
}

beforeEach(() => {
  mockApiRequest.mockReset();
});

describe("fetchAdminGymList", () => {
  it("asks for the plain route when given no options", () => {
    // No trailing "?" — API Gateway routes on the path and a bare query string is noise, but
    // more to the point an empty `?limit=` is a value the handler would try to read.
    resolves(adminGymListFixture());
    return fetchAdminGymList().then(() => {
      expect(mockApiRequest.mock.calls[0][0]).toBe("GET");
      expect(path()).toBe("/admin/gyms");
    });
  });

  it("sends limit and cursor when given them", async () => {
    resolves(adminGymListFixture());
    await fetchAdminGymList({ limit: 25, cursor: "abc" });
    expect(path()).toBe("/admin/gyms?limit=25&cursor=abc");
  });

  it("escapes a cursor containing base64 padding", async () => {
    // The realistic case, and the one that silently breaks paging: `LastEvaluatedKey` is base64,
    // so a raw `+` arrives at the server as a space and the cursor no longer decodes. Page two
    // then comes back empty or wrong, which looks like "we only have three gyms".
    resolves(adminGymListFixture());
    await fetchAdminGymList({ cursor: "eyJwayI6IkdZTStnIn0=" });
    expect(path()).toBe("/admin/gyms?cursor=eyJwayI6IkdZTStnIn0%3D");
    expect(path()).not.toContain("+");
  });

  it("omits an absent cursor rather than sending an empty one", async () => {
    resolves(adminGymListFixture());
    await fetchAdminGymList({ limit: 10, cursor: undefined });
    expect(path()).toBe("/admin/gyms?limit=10");
  });

  it("returns the parsed page", async () => {
    resolves(adminGymListFixture());
    const result = await fetchAdminGymList();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.gyms).toHaveLength(3);
    expect(result.data.nextCursor).toBeTruthy();
  });

  it("passes a transport failure through with its own message", async () => {
    // The server's message survives: a 429 means "try again in a minute", which the client
    // cannot reconstruct and must not overwrite.
    fails("network", "Could not reach the server.");
    const result = await fetchAdminGymList();
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toBe("Could not reach the server.");
    // Empty, and that emptiness is load-bearing: it is what tells a transport failure apart
    // from a schema failure at the call site.
    expect(result.issues).toEqual([]);
  });

  it("reports a malformed page with the field paths that failed", async () => {
    const list = adminGymListFixture() as unknown as Record<string, any>;
    list.gyms[0].status = "onboarding";
    resolves(list);
    const result = await fetchAdminGymList();
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.join(" ")).toContain("gyms.0.status");
  });

  it("treats a 200 with no body as malformed rather than as an empty list", async () => {
    // The difference matters: "no gyms" is a state an operator acts on by inviting one, and
    // "the response was not a list" is a state they act on by reading the handler.
    resolves(undefined);
    const result = await fetchAdminGymList();
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.length).toBeGreaterThan(0);
  });
});

describe("fetchAdminGymView", () => {
  it("asks for the gym by id", async () => {
    resolves(adminGymFixture());
    await fetchAdminGymView("gym_01HQZX9K2M4N6P8R");
    expect(path()).toBe("/admin/gyms/gym_01HQZX9K2M4N6P8R");
  });

  it("escapes an id it was handed", async () => {
    // The id comes off the URL, so it is attacker-influenced in the weak sense: a crafted link
    // must not be able to reach a different route by putting a slash in the segment.
    resolves(adminGymFixture());
    await fetchAdminGymView("../admin/gyms");
    expect(path()).toBe("/admin/gyms/..%2Fadmin%2Fgyms");
  });

  it("returns the parsed gym", async () => {
    resolves(adminGymFixture());
    const result = await fetchAdminGymView("gym_01HQZX9K2M4N6P8R");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.details.tradeName).toBe("Iron House Gym");
    expect(result.data.machine.deviceNo).toBe("MBP-000241");
  });

  it("reports a malformed gym with the field path", async () => {
    const gym = adminGymFixture() as unknown as Record<string, any>;
    delete gym.terms.securityDepositInr;
    resolves(gym);
    const result = await fetchAdminGymView("gym_1");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues).toContain("terms.securityDepositInr: Required");
  });

  it("passes a missing gym through as the transport error it arrives as", async () => {
    // A 404 arrives as `invalid_token`, because `codeForStatus` has no 404 mapping. Documented
    // rather than worked around — the message is the server's and it says the right thing.
    fails("invalid_token", "That gym could not be found.");
    const result = await fetchAdminGymView("gym_nope");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("invalid_token");
    expect(result.issues).toEqual([]);
  });
});

/** A valid, fully filled invite form — same shape `admin-invite-schema.test.ts` builds. */
function inviteForm(): AdminInviteFormInput {
  return {
    details: {
      legalEntityName: "Iron Temple Fitness Private Limited",
      entityType: "pvt_ltd",
      tradeName: "Iron Temple Fitness",
      gstin: "29AABCU9603R1ZM",
      fssaiLicenceNumber: "",
      registeredAddress: "14 Rajpur Road, Civil Lines, Delhi 110054",
      installationAddress: "Plot 8, Sector 18, Noida, Uttar Pradesh 201301",
      signatoryName: "Rohit Malhotra",
      signatoryDesignation: "Director",
      noticesEmail: "rohit@irontemple.in",
      noticesPhone: "+919812345678",
    },
    terms: {
      securityDepositInr: 50000,
      termMonths: 36,
      gymSharePctBeforeMilestone: 10,
      gymSharePctAfterMilestone: 20,
      milestoneCups: 15000,
      milestoneNetProfitInr: 1500000,
      advertisingGymSharePct: 20,
      electricityInrPerBlock: 1500,
      electricityCupsPerBlock: 1000,
      electricityReviewWindowMonths: 6,
      settlementDaysAfterMonthEnd: 15,
      earlyTerminationChargeInr: 0,
    },
    machine: {
      deviceNo: "MBP-000512",
      model: "MuscleBoxPro MBP-1",
      serialNumber: "",
      accessories: "",
      valueInr: 450000,
      installationDate: "",
    },
    invitedByName: "",
  };
}

describe("createGym", () => {
  it("posts to /admin/gyms with the wire body, not the form shape", async () => {
    resolves({
      gymId: "gym_new",
      slug: "iron-temple-fitness",
      onboardingUrl: "https://onboard.muscleboxpro.com/iron-temple-fitness/h_abc123",
      tokenId: "tok_1",
      expiresAt: "2026-09-22T09:30:00.000Z",
    });
    await createGym(toAdminInviteBody(inviteForm()));
    expect(mockApiRequest.mock.calls[0][0]).toBe("POST");
    expect(path()).toBe("/admin/gyms");
    const options = mockApiRequest.mock.calls[0][2] as { body: unknown };
    // The one field the wire body drops relative to the form: a blank `invitedByName` is an
    // absent key, not an empty string — `toAdminInviteBody` is what makes that true, and this
    // is the assertion that the seam sends what it was given rather than the form directly.
    expect(options.body).not.toHaveProperty("invitedByName");
    expect((options.body as { machine: { deviceNo: string } }).machine.deviceNo).toBe("MBP-000512");
  });

  it("returns the link on success", async () => {
    resolves({
      gymId: "gym_new",
      slug: "iron-temple-fitness",
      onboardingUrl: "https://onboard.muscleboxpro.com/iron-temple-fitness/h_abc123",
      tokenId: "tok_1",
      expiresAt: "2026-09-22T09:30:00.000Z",
    });
    const result = await createGym(toAdminInviteBody(inviteForm()));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.onboardingUrl).toBe("https://onboard.muscleboxpro.com/iron-temple-fitness/h_abc123");
  });

  it("surfaces namespaced field errors from a rejected block", async () => {
    // The handler validates all four blocks before reporting any of them, so a bad GSTIN and a
    // bad device number arrive together, namespaced by block.
    fails("validation", "Some fields need fixing.");
    mockApiRequest.mockResolvedValue({
      ok: false,
      error: {
        code: "validation",
        message: "Some fields need fixing.",
        fieldErrors: {
          "details.gstin": "That does not look like a GSTIN.",
          "machine.deviceNo": "Letters, digits, hyphen and underscore only.",
        },
      },
    });
    const result = await createGym(toAdminInviteBody(inviteForm()));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.fieldErrors).toEqual({
      "details.gstin": "That does not look like a GSTIN.",
      "machine.deviceNo": "Letters, digits, hyphen and underscore only.",
    });
  });

  it("treats a 2xx with no onboarding link as malformed rather than as a created gym", async () => {
    // The one field that decides: without it, this screen cannot do the one thing it exists to
    // do, and a retry would create a second gym for the same form.
    resolves({ gymId: "gym_new", slug: "iron-temple-fitness" });
    const result = await createGym(toAdminInviteBody(inviteForm()));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("network");
  });

  it("passes a transport failure through unchanged", async () => {
    fails("network", "Could not reach the server.");
    const result = await createGym(toAdminInviteBody(inviteForm()));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toBe("Could not reach the server.");
  });
});

describe("the query keys", () => {
  it("nest under one admin prefix so signing out can evict them together", () => {
    // `AdminShell.handleSignOut` removes `["admin"]` wholesale. That only works while every
    // admin key starts with it, so this is the assertion that keeps one admin's gym data out of
    // the next admin's cache.
    expect(ADMIN_GYMS_QUERY_KEY[0]).toBe("admin");
    expect(adminGymQueryKey("gym_1")[0]).toBe("admin");
  });

  it("gives each gym its own key", () => {
    expect(adminGymQueryKey("gym_1")).not.toEqual(adminGymQueryKey("gym_2"));
  });
});
