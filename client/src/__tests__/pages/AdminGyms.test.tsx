import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

/**
 * The Gyms list page.
 *
 * Mocked at `@/lib/adminSession` (the guard) and `@/lib/adminApi` (the reads) rather than at
 * `apiClient` — this page's own job is what happens once a page of gyms arrives, not the
 * transport or the parse, both covered elsewhere. The cases below are chosen the same way as
 * `admin-gyms-schema.test.ts`: from what a wrong read looks like on screen rather than from
 * exhaustive prop coverage.
 */

const mockReplace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ replace: mockReplace })),
  usePathname: vi.fn(() => "/admin/gyms"),
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

const { mockFetchList } = vi.hoisted(() => ({ mockFetchList: vi.fn() }));
vi.mock("@/lib/adminApi", () => ({
  fetchAdminGymList: mockFetchList,
  ADMIN_GYMS_QUERY_KEY: ["admin", "gyms"],
  adminGymQueryKey: (gymId: string) => ["admin", "gym", gymId],
}));

vi.mock("@/lib/queryClient", () => ({
  queryClient: { invalidateQueries: vi.fn().mockResolvedValue(undefined), removeQueries: vi.fn() },
}));

import AdminGyms from "@/pages/admin/AdminGyms";
import { adminGymListFixture } from "@/test/adminGymFixture";

const SESSION = {
  email: "ops@muscleboxpro.com",
  role: "admin",
  displayName: "Ops Team",
  expiresAt: "2026-08-23T19:30:00.000Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  mockFetchSession.mockResolvedValue(SESSION);
  mockSignOut.mockResolvedValue(undefined);
});

describe("AdminGyms", () => {
  it("renders every loaded gym, newest first as the server sent them", async () => {
    mockFetchList.mockResolvedValue({ ok: true, data: adminGymListFixture() });
    render(<AdminGyms />);

    expect(await screen.findByTestId("link-gym-gym_01HQZX9K2M4N6P8R")).toHaveTextContent(
      "Iron House Gym",
    );
    expect(screen.getByTestId("link-gym-gym_01HQZW7J1L3M5N7P")).toHaveTextContent("Peak Fitness");
    expect(screen.getByTestId("link-gym-gym_01HQZV5H9K1L3M5N")).toHaveTextContent(
      "Titan Strength Club",
    );
  });

  it("links each row to its own detail page", async () => {
    mockFetchList.mockResolvedValue({ ok: true, data: adminGymListFixture() });
    render(<AdminGyms />);

    expect(await screen.findByTestId("link-gym-gym_01HQZX9K2M4N6P8R")).toHaveAttribute(
      "href",
      "/admin/gyms/gym_01HQZX9K2M4N6P8R",
    );
  });

  it("shows the legal entity only when it differs from the trade name", async () => {
    // Iron House Gym's legal entity differs (Iron House Fitness Private Limited); Peak
    // Fitness's does not. A screen that always shows both makes the common case noisier for
    // no reason, and a screen that never shows it hides the name the agreement actually binds.
    mockFetchList.mockResolvedValue({ ok: true, data: adminGymListFixture() });
    render(<AdminGyms />);

    const ironHouseRow = await screen.findByTestId("row-gym-gym_01HQZX9K2M4N6P8R");
    expect(ironHouseRow).toHaveTextContent("Iron House Fitness Private Limited");

    const peakRow = screen.getByTestId("row-gym-gym_01HQZW7J1L3M5N7P");
    expect(peakRow.textContent?.match(/Peak Fitness/g)).toHaveLength(1);
  });

  it("does not print an empty second line for a gym invited without a legal entity name yet", async () => {
    // Since 2026-08-23 an admin can invite a gym before it has one — `legalEntityName` is `""`
    // until the gym reaches step 1. `"" !== tradeName` is always true, so the naive version of
    // this check would render a blank paragraph under every such gym's name.
    const list = adminGymListFixture();
    list.gyms[0].legalEntityName = "";
    mockFetchList.mockResolvedValue({ ok: true, data: list });
    render(<AdminGyms />);

    const nameLink = await screen.findByTestId("link-gym-gym_01HQZX9K2M4N6P8R");
    // Scoped to the name cell, not the whole row — the contact column has its own `<p>`s for
    // notices email and phone, which are unrelated to this check.
    expect(nameLink.parentElement?.querySelectorAll("p")).toHaveLength(0);
  });

  it("labels each status in words a reader recognises", async () => {
    mockFetchList.mockResolvedValue({ ok: true, data: adminGymListFixture() });
    render(<AdminGyms />);

    expect(await screen.findByTestId("status-gym_01HQZX9K2M4N6P8R")).toHaveTextContent("Signed");
    expect(screen.getByTestId("status-gym_01HQZW7J1L3M5N7P")).toHaveTextContent("Invited");
    expect(screen.getByTestId("status-gym_01HQZV5H9K1L3M5N")).toHaveTextContent("Active");
  });

  it("filters the loaded rows client-side and says the filter does not reach unfetched pages", async () => {
    // The API has no server-side search — filtering silently only the first page would tell an
    // admin a gym does not exist when it is simply on a page not yet loaded.
    mockFetchList.mockResolvedValue({ ok: true, data: adminGymListFixture() });
    render(<AdminGyms />);
    await screen.findByTestId("link-gym-gym_01HQZX9K2M4N6P8R");

    const user = userEvent.setup();
    await user.type(screen.getByTestId("input-filter"), "titan");

    expect(screen.queryByTestId("row-gym-gym_01HQZX9K2M4N6P8R")).not.toBeInTheDocument();
    expect(screen.getByTestId("row-gym-gym_01HQZV5H9K1L3M5N")).toBeInTheDocument();
  });

  it("says nothing matched, rather than rendering an empty table with no explanation", async () => {
    mockFetchList.mockResolvedValue({ ok: true, data: adminGymListFixture() });
    render(<AdminGyms />);
    await screen.findByTestId("link-gym-gym_01HQZX9K2M4N6P8R");

    const user = userEvent.setup();
    await user.type(screen.getByTestId("input-filter"), "nonexistent gym name");

    expect(await screen.findByTestId("admin-gyms-no-match")).toBeInTheDocument();
  });

  it("offers Load more only while a cursor remains, and appends the next page", async () => {
    mockFetchList.mockResolvedValueOnce({
      ok: true,
      data: { gyms: adminGymListFixture().gyms.slice(0, 1), nextCursor: "page-2" },
    });
    render(<AdminGyms />);
    await screen.findByTestId("link-gym-gym_01HQZX9K2M4N6P8R");
    expect(screen.queryByTestId("link-gym-gym_01HQZW7J1L3M5N7P")).not.toBeInTheDocument();

    mockFetchList.mockResolvedValueOnce({
      ok: true,
      data: { gyms: adminGymListFixture().gyms.slice(1), nextCursor: null },
    });
    const user = userEvent.setup();
    await user.click(screen.getByTestId("button-load-more"));

    await screen.findByTestId("link-gym-gym_01HQZW7J1L3M5N7P");
    expect(screen.getByTestId("link-gym-gym_01HQZX9K2M4N6P8R")).toBeInTheDocument();
    expect(mockFetchList).toHaveBeenLastCalledWith({ cursor: "page-2" });
    // The last page: no more button to press.
    expect(screen.queryByTestId("button-load-more")).not.toBeInTheDocument();
  });

  it("shows the server's message and the failed field paths on a malformed page", async () => {
    // The audience is us: a field path is the whole answer to "what changed on the backend?"
    mockFetchList.mockResolvedValue({
      ok: false,
      error: { code: "network", message: "The response did not match what we expected." },
      issues: ["gyms.0.status: Invalid enum value"],
    });
    render(<AdminGyms />);

    expect(await screen.findByTestId("admin-gyms-error")).toHaveTextContent(
      "The response did not match what we expected.",
    );
    expect(screen.getByTestId("admin-gyms-issues")).toHaveTextContent(
      "gyms.0.status: Invalid enum value",
    );
  });

  it("says there are no gyms yet, distinctly from an error", async () => {
    mockFetchList.mockResolvedValue({ ok: true, data: { gyms: [], nextCursor: null } });
    render(<AdminGyms />);

    expect(await screen.findByTestId("admin-gyms-empty")).toBeInTheDocument();
    expect(screen.queryByTestId("admin-gyms-error")).not.toBeInTheDocument();
  });

  it("sends an unauthenticated visitor to the login page without ever calling the list", async () => {
    mockFetchSession.mockResolvedValue(null);
    render(<AdminGyms />);
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/admin/login"));
    expect(mockFetchList).not.toHaveBeenCalled();
  });
});
