import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

/**
 * The franchise invite form, and what arriving from an enquiry does to it.
 *
 * `AdminInviteGym.test.tsx`'s division, mocked at the guard and at `createFranchise`. The cases here
 * are the ones the query-string prefill could get wrong without failing:
 *
 * - **The three fields that cross, and the one that must not.** A legal entity name arriving prefilled
 *   from a free-text company field is a value nobody chose the moment they click past it, and it is
 *   what the term sheet identifies its counterparty by.
 * - **`sourceApplicationId` reaching the wire**, since it is the only thing that stops an enquiry and
 *   its franchise being counted as two leads.
 * - **A blank form when nothing was passed**, because that is still how most invites are sent.
 */

const { mockSearchParams } = vi.hoisted(() => ({ mockSearchParams: { current: "" } }));
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ replace: vi.fn(), push: vi.fn() })),
  usePathname: vi.fn(() => "/admin/franchises/new"),
  useSearchParams: vi.fn(() => new URLSearchParams(mockSearchParams.current)),
}));

vi.mock("next/link", () => ({
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const { mockFetchSession, mockSignOut } = vi.hoisted(() => ({
  mockFetchSession: vi.fn(),
  mockSignOut: vi.fn(),
}));
vi.mock("@/lib/adminSession", () => ({
  ADMIN_SESSION_QUERY_KEY: ["admin-session"],
  fetchAdminSession: mockFetchSession,
  signOutAsAdmin: mockSignOut,
}));

const { mockCreateFranchise } = vi.hoisted(() => ({ mockCreateFranchise: vi.fn() }));
vi.mock("@/lib/adminFranchiseApi", () => ({ createFranchise: mockCreateFranchise }));

vi.mock("@/lib/queryClient", () => ({
  queryClient: { invalidateQueries: vi.fn().mockResolvedValue(undefined), removeQueries: vi.fn() },
}));

import AdminInviteFranchise from "@/pages/admin/AdminInviteFranchise";
import { inviteHrefForApplication } from "@/pages/admin/franchiseInviteLink";
import { franchiseApplicationPageFixture } from "@/test/franchiseApplicationsFixture";

const SESSION = {
  email: "ops@muscleboxpro.com",
  role: "admin",
  displayName: "Ops Team",
  expiresAt: "2026-09-30T19:30:00.000Z",
};

const APPLICATION = franchiseApplicationPageFixture().applications[1];

/** The query string the enquiry list would have linked here with. */
function arrivingFromEnquiry(): void {
  mockSearchParams.current = inviteHrefForApplication(APPLICATION).split("?")[1];
}

beforeEach(() => {
  vi.clearAllMocks();
  mockSearchParams.current = "";
  mockFetchSession.mockResolvedValue(SESSION);
  mockSignOut.mockResolvedValue(undefined);
  mockCreateFranchise.mockResolvedValue({
    ok: true,
    data: {
      franchiseId: "b7e2c1a4-9f38-4d6b-8e05-3c1f7a2d9b64",
      slug: "shetty-fitness",
      onboardingUrl: "https://muscleboxpro.com/franchise/onboarding/shetty-fitness/3f7c9a1e5b2d",
      tokenId: "e5147c02-8b6a-4d93-9f21-3c70a5e8b146",
      expiresAt: "2026-09-30T05:12:00.000Z",
      emailed: true,
    },
  });
});

describe("AdminInviteFranchise, arriving fresh", () => {
  it("opens blank, with no enquiry panel and no application id", async () => {
    render(<AdminInviteFranchise />);

    await screen.findByTestId("franchise-invite-heading");
    expect(screen.queryByTestId("franchise-invite-source")).toBeNull();
    expect(screen.getByTestId("input-sourceApplicationId")).toHaveValue("");
    expect(screen.getByTestId("input-noticesEmail")).toHaveValue("");
  });
});

describe("AdminInviteFranchise, arriving from an enquiry", () => {
  it("fills the contact fields and the application id", async () => {
    arrivingFromEnquiry();
    render(<AdminInviteFranchise />);

    await screen.findByTestId("franchise-invite-heading");
    expect(screen.getByTestId("input-noticesEmail")).toHaveValue("vikram@shettyfitness.in");
    expect(screen.getByTestId("input-noticesPhone")).toHaveValue("+919632440118");
    expect(screen.getByTestId("input-sourceApplicationId")).toHaveValue(APPLICATION.applicationId);
  });

  it("leaves the legal entity name empty and shows what the applicant wrote instead", async () => {
    arrivingFromEnquiry();
    render(<AdminInviteFranchise />);

    await screen.findByTestId("franchise-invite-source");
    expect(screen.getByTestId("input-legalEntityName")).toHaveValue("");
    expect(screen.getByTestId("source-applicant")).toHaveTextContent("Vikram Shetty");
    expect(screen.getByTestId("source-company")).toHaveTextContent("Shetty Fitness Ventures");
  });

  it("selects the tier the applicant asked for", async () => {
    arrivingFromEnquiry();
    render(<AdminInviteFranchise />);

    expect(await screen.findByTestId("tier-territory")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("input-investmentInr")).toHaveValue(25_00_000);
  });

  it("sends the application id with the invite, so the two are not counted twice", async () => {
    arrivingFromEnquiry();
    render(<AdminInviteFranchise />);

    await userEvent.type(
      await screen.findByTestId("input-legalEntityName"),
      "Shetty Fitness Ventures LLP",
    );
    await userEvent.click(screen.getByTestId("button-create-franchise"));

    await waitFor(() =>
      expect(mockCreateFranchise).toHaveBeenCalledWith(
        expect.objectContaining({
          sourceApplicationId: APPLICATION.applicationId,
          legalEntityName: "Shetty Fitness Ventures LLP",
          noticesEmail: "vikram@shettyfitness.in",
          investmentPaise: 250_000_000,
        }),
      ),
    );
    expect(await screen.findByTestId("franchise-invite-created")).toBeInTheDocument();
  });

  it("still refuses to create a franchise with no legal entity name", async () => {
    // The prefill deliberately leaves it blank, so this is the field that stops a converted enquiry
    // becoming a franchise nobody named.
    arrivingFromEnquiry();
    render(<AdminInviteFranchise />);

    await userEvent.click(await screen.findByTestId("button-create-franchise"));

    await waitFor(() => expect(mockCreateFranchise).not.toHaveBeenCalled());
  });

  it("says none was given when the applicant left the company blank", async () => {
    mockSearchParams.current = inviteHrefForApplication({
      ...APPLICATION,
      company: undefined,
    }).split("?")[1];
    render(<AdminInviteFranchise />);

    expect(await screen.findByTestId("source-company")).toHaveTextContent("None given");
  });
});
