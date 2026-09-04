import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

/**
 * The Enquiries page, and specifically the franchise tab on it.
 *
 * `AdminGyms.test.tsx`'s division: the guard and both API seams are mocked, because the transport and
 * the parses are covered elsewhere and what is under test is what this screen does with what arrives.
 * The three lead kinds are the same shape they always were; the cases below are the ones the fourth tab
 * introduced, and each of them is a way this page could mislead somebody.
 *
 * 1. **It reads a different API.** The franchise backlog is not a lead kind, so asking the leads route
 *    for one would be a 404 and a tab that never fills.
 * 2. **A franchise response must not redraw the tab strip.** Three of the four tabs come from the leads
 *    route's own `kinds`; the franchise API knows nothing about them and must not narrow them to itself.
 * 3. **The row's next step is the applicant's, not a generic link.** A converted enquiry points at its
 *    franchise and an untouched one at the invite form carrying its answers.
 * 4. **Nothing here writes.** Triage lives on the Franchises screen, and this page must not have grown
 *    a second copy of the decision form.
 */

const mockReplace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ replace: mockReplace })),
  usePathname: vi.fn(() => "/admin/leads"),
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

const { mockFetchLeads } = vi.hoisted(() => ({ mockFetchLeads: vi.fn() }));
vi.mock("@/lib/adminLeadsApi", () => ({ fetchLeads: mockFetchLeads }));

const { mockFetchApplications } = vi.hoisted(() => ({ mockFetchApplications: vi.fn() }));
vi.mock("@/lib/adminFranchiseApi", () => ({
  fetchFranchiseApplications: mockFetchApplications,
}));

vi.mock("@/lib/queryClient", () => ({
  queryClient: { invalidateQueries: vi.fn().mockResolvedValue(undefined), removeQueries: vi.fn() },
}));

import AdminLeads from "@/pages/admin/AdminLeads";
import { franchiseApplicationPageFixture } from "@/test/franchiseApplicationsFixture";

const NEW_ID = "3f7c9a1e-5b2d-4068-a5c3-e7f9b2d40681";
const CONVERTED_ID = "e5147c02-8b6a-4d93-9f21-3c70a5e8b146";

const SESSION = {
  email: "ops@muscleboxpro.com",
  role: "admin",
  displayName: "Ops Team",
  expiresAt: "2026-08-23T19:30:00.000Z",
};

/** One demo request, so the tab the page opens on has something to render. */
const DEMO_PAGE = {
  kind: "demo" as const,
  kinds: ["demo", "campaign", "investor"] as const,
  leads: [
    {
      id: "6d1f0a92-3c4b-4e77-9a15-0b8e2d6f4c31",
      kind: "demo" as const,
      name: "Iron House",
      email: "owner@ironhouse.in",
      phone: "+919812340011",
      createdAt: "2026-08-30T06:20:00.000Z",
      organisation: "Iron House Gym",
      location: "Indore",
      investorType: null,
      message: null,
      reference: null,
    },
  ],
  total: 1,
};

async function openFranchiseTab() {
  const user = userEvent.setup();
  await screen.findByTestId("tab-leads-franchise");
  await user.click(screen.getByTestId("tab-leads-franchise"));
  return user;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockFetchSession.mockResolvedValue(SESSION);
  mockSignOut.mockResolvedValue(undefined);
  mockFetchLeads.mockResolvedValue({ ok: true, data: DEMO_PAGE });
  mockFetchApplications.mockResolvedValue({ ok: true, data: franchiseApplicationPageFixture() });
});

describe("AdminLeads", () => {
  it("offers a franchise tab beside the three kinds the leads route names", async () => {
    render(<AdminLeads />);

    expect(await screen.findByTestId("tab-leads-demo")).toBeInTheDocument();
    expect(screen.getByTestId("tab-leads-campaign")).toBeInTheDocument();
    expect(screen.getByTestId("tab-leads-investor")).toBeInTheDocument();
    expect(screen.getByTestId("tab-leads-franchise")).toBeInTheDocument();
  });

  it("reads the franchise backlog from its own API, never as a lead kind", async () => {
    render(<AdminLeads />);
    await openFranchiseTab();

    await waitFor(() => expect(mockFetchApplications).toHaveBeenCalledWith({ limit: 100 }));
    // `fetchLeads` was called once, for the tab the page opened on, and never with "franchise".
    expect(mockFetchLeads).toHaveBeenCalledTimes(1);
    expect(mockFetchLeads).toHaveBeenCalledWith("demo");
  });

  it("keeps the other three tabs when the franchise API answers", async () => {
    render(<AdminLeads />);
    await openFranchiseTab();

    expect(await screen.findByTestId(`row-lead-${NEW_ID}`)).toBeInTheDocument();
    expect(screen.getByTestId("tab-leads-demo")).toBeInTheDocument();
    expect(screen.getByTestId("tab-leads-campaign")).toBeInTheDocument();
    expect(screen.getByTestId("tab-leads-investor")).toBeInTheDocument();
  });

  it("shows the applicant's reference, what they want and where triage has got to", async () => {
    render(<AdminLeads />);
    await openFranchiseTab();

    const row = await screen.findByTestId(`row-lead-${NEW_ID}`);
    expect(row).toHaveTextContent("Rhea Menon");
    expect(screen.getByTestId(`lead-reference-${NEW_ID}`)).toHaveTextContent("MBP-FR-3F7C9A1E5B");
    expect(row).toHaveTextContent("Kochi and Thrissur");
    expect(row).toHaveTextContent("10 machines");
    expect(screen.getByTestId(`lead-status-${NEW_ID}`)).toHaveTextContent("New");
  });

  /*
    The two ends of the pipeline, from one list. An untouched enquiry is something to act on and a
    converted one is a franchise to open, and a single "see the enquiry backlog" link would be neither.
  */
  it("points an untouched enquiry at the invite form with its own answers on it", async () => {
    render(<AdminLeads />);
    await openFranchiseTab();

    const link = await screen.findByTestId(`lead-next-${NEW_ID}`);
    expect(link).toHaveTextContent("Invite");
    const href = link.getAttribute("href") ?? "";
    expect(href.startsWith("/admin/franchises/new?")).toBe(true);
    const params = new URLSearchParams(href.slice(href.indexOf("?") + 1));
    expect(params.get("application")).toBe(NEW_ID);
    expect(params.get("email")).toBe("rhea.menon@gmail.com");
    expect(params.get("tier")).toBe("city");
  });

  it("points a converted enquiry at its franchise instead", async () => {
    render(<AdminLeads />);
    await openFranchiseTab();

    const link = await screen.findByTestId(`lead-next-${CONVERTED_ID}`);
    expect(link).toHaveTextContent("Its franchise");
    expect(link).toHaveAttribute(
      "href",
      "/admin/franchises/b7e2c1a4-9f38-4d6b-8e05-3c1f7a2d9b64",
    );
  });

  /*
    The one place this list deliberately shows less than the screen that owns the row. The triage
    table offers Invite on a rejected enquiry, and it can afford to: the note saying why is on the
    same screen, one click away. Here there is no note and no way to reach one, so an Invite link
    would be an invitation to somebody we decided against, offered without the reason in sight.
  */
  it("offers no invite on a rejected enquiry", async () => {
    render(<AdminLeads />);
    await openFranchiseTab();

    const rejected = "c94b0e73-1a68-42f5-8d07-b3e6c1f90224";
    expect(await screen.findByTestId(`lead-status-${rejected}`)).toHaveTextContent("Rejected");
    expect(screen.queryByTestId(`lead-next-${rejected}`)).toBeNull();
  });

  it("offers no decision on a franchise enquiry, because triage lives elsewhere", async () => {
    render(<AdminLeads />);
    await openFranchiseTab();

    await screen.findByTestId(`row-lead-${NEW_ID}`);
    expect(screen.queryByTestId("franchise-applications")).toBeNull();
    expect(screen.queryByRole("button", { name: /mark reviewed/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /mark rejected/i })).toBeNull();
  });

  it("filters loaded franchise enquiries by reference", async () => {
    render(<AdminLeads />);
    const user = await openFranchiseTab();

    await screen.findByTestId(`row-lead-${NEW_ID}`);
    await user.type(screen.getByTestId("input-filter-leads"), "MBP-FR-A2D51C607E");

    await waitFor(() => expect(screen.queryByTestId(`row-lead-${NEW_ID}`)).toBeNull());
    expect(screen.getByText("Vikram Shetty")).toBeInTheDocument();
  });
});
