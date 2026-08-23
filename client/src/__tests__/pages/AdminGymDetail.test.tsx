import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

/**
 * The gym detail page — the screen that answers "why is this gym stuck?"
 *
 * Mocked at the guard and at `fetchAdminGymView`, for the same reason as `AdminGyms.test.tsx`:
 * the parse itself is `admin-gyms-schema.test.ts`'s job, and what this page owns is what it
 * does with the parsed shape — in particular the one trap the type documents,
 * `machine.deviceNo === null` versus `machine === null`, and the timeline showing gaps rather
 * than only events.
 */

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ replace: vi.fn() })),
  usePathname: vi.fn(() => "/admin/gyms/gym_01HQZX9K2M4N6P8R"),
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

const { mockFetchView } = vi.hoisted(() => ({ mockFetchView: vi.fn() }));
vi.mock("@/lib/adminApi", () => ({
  fetchAdminGymView: mockFetchView,
  ADMIN_GYMS_QUERY_KEY: ["admin", "gyms"],
  adminGymQueryKey: (gymId: string) => ["admin", "gym", gymId],
}));

vi.mock("@/lib/queryClient", () => ({
  queryClient: { invalidateQueries: vi.fn().mockResolvedValue(undefined), removeQueries: vi.fn() },
}));

import AdminGymDetail from "@/pages/admin/AdminGymDetail";
import { adminGymFixture } from "@/test/adminGymFixture";

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

describe("AdminGymDetail", () => {
  it("asks for the gym it was given, not a hardcoded one", async () => {
    mockFetchView.mockResolvedValue({ ok: true, data: adminGymFixture() });
    render(<AdminGymDetail gymId="gym_01HQZX9K2M4N6P8R" />);
    await waitFor(() => expect(mockFetchView).toHaveBeenCalledWith("gym_01HQZX9K2M4N6P8R"));
  });

  it("renders the trade name, status and step", async () => {
    mockFetchView.mockResolvedValue({ ok: true, data: adminGymFixture() });
    render(<AdminGymDetail gymId="gym_01HQZX9K2M4N6P8R" />);

    expect(await screen.findByTestId("gym-heading")).toHaveTextContent("Iron House Gym");
    expect(screen.getByTestId("gym-status")).toHaveTextContent("Signed");
    expect(screen.getByText(/On step 4/)).toBeInTheDocument();
  });

  it("shows every stage of the funnel, including the ones that have not happened", async () => {
    // The gap is the diagnosis: this gym has not paid its deposit, and that has to be visibly
    // blank rather than simply missing from a list of what did happen.
    mockFetchView.mockResolvedValue({ ok: true, data: adminGymFixture() });
    render(<AdminGymDetail gymId="gym_01HQZX9K2M4N6P8R" />);

    expect(await screen.findByTestId("timeline-signedAt")).toHaveTextContent("Signed");
    const unpaid = screen.getByTestId("timeline-depositPaidAt");
    expect(unpaid).toHaveTextContent("—");
  });

  it("renders the machine when one is allocated", async () => {
    mockFetchView.mockResolvedValue({ ok: true, data: adminGymFixture() });
    render(<AdminGymDetail gymId="gym_01HQZX9K2M4N6P8R" />);

    const card = await screen.findByTestId("card-machine");
    expect(card).toHaveTextContent("MBP-000241");
    expect(screen.queryByTestId("machine-none")).not.toBeInTheDocument();
  });

  it("does not mistake the zero-valued projection for a real machine", async () => {
    // The trap the type itself documents: `machineOf(null)` returns `deviceNo: null`, not
    // `machine === null`. Checking the wrong field would render a gym with no machine as a
    // ₹0 unit called "".
    const gym = adminGymFixture();
    gym.machine = {
      model: "",
      deviceNo: null,
      serialNumber: null,
      valueInr: 0,
      accessories: "",
      installationDate: null,
    };
    mockFetchView.mockResolvedValue({ ok: true, data: gym });
    render(<AdminGymDetail gymId="gym_01HQZX9K2M4N6P8R" />);

    expect(await screen.findByTestId("machine-none")).toBeInTheDocument();
    // Scoped to the machine card: the terms card legitimately shows "₹0" for a standard
    // early-termination charge, and that is not the projection this test is about.
    expect(screen.getByTestId("card-machine")).not.toHaveTextContent("₹0");
  });

  it("keeps a replaced unit visible in the machine history", async () => {
    mockFetchView.mockResolvedValue({ ok: true, data: adminGymFixture() });
    render(<AdminGymDetail gymId="gym_01HQZX9K2M4N6P8R" />);

    const table = await screen.findByTestId("table-machines");
    expect(table).toHaveTextContent("MBP-000188");
    expect(table).toHaveTextContent("Replaced");
  });

  it("distinguishes a waived deposit from one nobody chased", async () => {
    mockFetchView.mockResolvedValue({ ok: true, data: adminGymFixture() });
    render(<AdminGymDetail gymId="gym_01HQZX9K2M4N6P8R" />);

    const waiver = await screen.findByTestId("deposit-waiver");
    expect(waiver).toHaveTextContent("Deposit waived for the first ten partner gyms");
    expect(waiver).toHaveTextContent("contact@muscleboxpro.com");
  });

  it("shows the deposit amount converted from paise, and the link id for reconciliation", async () => {
    mockFetchView.mockResolvedValue({ ok: true, data: adminGymFixture() });
    render(<AdminGymDetail gymId="gym_01HQZX9K2M4N6P8R" />);

    const table = await screen.findByTestId("table-deposits");
    // amountPaise: 5000000 → ₹50,000
    expect(table).toHaveTextContent("₹50,000");
    expect(table).toHaveTextContent("plink_QxYz1234abcd");
  });

  it("zero and null early-termination charges read differently", async () => {
    const gym = adminGymFixture();
    gym.terms.earlyTerminationChargeInr = 0;
    mockFetchView.mockResolvedValue({ ok: true, data: gym });
    render(<AdminGymDetail gymId="gym_01HQZX9K2M4N6P8R" />);
    expect(await screen.findByTestId("card-terms")).toHaveTextContent("₹0");
  });

  it("says the charge was not agreed rather than printing a placeholder zero", async () => {
    const gym = adminGymFixture();
    gym.terms.earlyTerminationChargeInr = null;
    mockFetchView.mockResolvedValue({ ok: true, data: gym });
    render(<AdminGymDetail gymId="gym_01HQZX9K2M4N6P8R" />);
    expect(await screen.findByTestId("card-terms")).toHaveTextContent("Not agreed");
  });

  it("shows the invite's audit fields but never the link itself", async () => {
    // Only sha256(handle) is stored — the handle is recoverable exactly once, in the response
    // that minted it. This screen has no way to reconstruct it and must not pretend to.
    mockFetchView.mockResolvedValue({ ok: true, data: adminGymFixture() });
    render(<AdminGymDetail gymId="gym_01HQZX9K2M4N6P8R" />);

    const card = await screen.findByTestId("card-invite");
    expect(card).toHaveTextContent("contact@muscleboxpro.com");
    // Scoped to the invite card: the shell's own footer legitimately prints the API's https
    // URL, and that is not the leak this test is about.
    expect(card).not.toHaveTextContent(/http/);
  });

  it("says a gym with no signature is not signed, without erroring", async () => {
    // Contradictory with a `signed` status, and that contradiction is exactly the question
    // this page exists to surface rather than hide.
    const gym = adminGymFixture();
    gym.signature = null;
    mockFetchView.mockResolvedValue({ ok: true, data: gym });
    render(<AdminGymDetail gymId="gym_01HQZX9K2M4N6P8R" />);

    expect(await screen.findByTestId("signature-none")).toBeInTheDocument();
  });

  it("shows the server's message and field paths on a malformed gym", async () => {
    mockFetchView.mockResolvedValue({
      ok: false,
      error: { code: "network", message: "The response did not match what we expected." },
      issues: ["terms.securityDepositInr: Required"],
    });
    render(<AdminGymDetail gymId="gym_01HQZX9K2M4N6P8R" />);

    expect(await screen.findByTestId("gym-error")).toHaveTextContent(
      "The response did not match what we expected.",
    );
    expect(screen.getByTestId("gym-issues")).toHaveTextContent("terms.securityDepositInr: Required");
  });

  it("links back to the gyms list", async () => {
    mockFetchView.mockResolvedValue({ ok: true, data: adminGymFixture() });
    render(<AdminGymDetail gymId="gym_01HQZX9K2M4N6P8R" />);

    expect(await screen.findByTestId("link-back-to-gyms")).toHaveAttribute("href", "/admin/gyms");
  });
});
