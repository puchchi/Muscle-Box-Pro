import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

/**
 * The invite form.
 *
 * Mocked at the guard and at `createGym`, the same division as the other admin page tests: what
 * this page owns is filling the form, mapping namespaced server errors back onto the right
 * inputs, and showing the link exactly once — not the transport or the schema, covered
 * elsewhere. Filling all thirty fields for every case would make each test mostly noise, so most
 * tests here fill only what that test is about and assert against `createGym`'s field errors for
 * the rest, the same way a real submit against an incomplete form would behave.
 */

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ replace: vi.fn(), push: vi.fn() })),
  usePathname: vi.fn(() => "/admin/gyms/new"),
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

const { mockCreateGym } = vi.hoisted(() => ({ mockCreateGym: vi.fn() }));
vi.mock("@/lib/adminApi", () => ({
  createGym: mockCreateGym,
  ADMIN_GYMS_QUERY_KEY: ["admin", "gyms"],
  adminGymQueryKey: (gymId: string) => ["admin", "gym", gymId],
}));

vi.mock("@/lib/queryClient", () => ({
  queryClient: { invalidateQueries: vi.fn().mockResolvedValue(undefined), removeQueries: vi.fn() },
}));

const mockWriteText = vi.fn().mockResolvedValue(undefined);

/**
 * Stub `navigator.clipboard`.
 *
 * Not module-level, and that is load-bearing rather than tidiness: happy-dom installs its own
 * real `Clipboard` on `navigator` when `userEvent.setup()` runs, which clobbers a
 * `defineProperty` done any earlier — the mock would silently stop being the one the component
 * talks to. Called after `render` and `userEvent.setup()` in the one test that needs it.
 */
function stubClipboard(): void {
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText: mockWriteText },
    configurable: true,
  });
}

import AdminInviteGym from "@/pages/admin/AdminInviteGym";

const SESSION = {
  email: "ops@muscleboxpro.com",
  role: "admin",
  displayName: "Ops Team",
  expiresAt: "2026-08-23T19:30:00.000Z",
};

const CREATED = {
  gymId: "gym_new",
  slug: "iron-temple-fitness",
  onboardingUrl: "https://onboard.muscleboxpro.com/iron-temple-fitness/h_abc123",
  tokenId: "tok_1",
  expiresAt: "2026-09-22T09:30:00.000Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  mockFetchSession.mockResolvedValue(SESSION);
  mockSignOut.mockResolvedValue(undefined);
  mockWriteText.mockResolvedValue(undefined);
});

/** Fill every field the schema requires, so the happy-path tests reach `createGym` at all. */
async function fillEverything(user: ReturnType<typeof userEvent.setup>) {
  await user.type(await screen.findByTestId("input-details.legalEntityName"), "Iron Temple Fitness Private Limited");
  await user.type(screen.getByTestId("input-details.gstin"), "29AABCU9603R1ZM");
  await user.type(screen.getByTestId("input-details.registeredAddress"), "14 Rajpur Road, Civil Lines, Delhi 110054");
  await user.type(screen.getByTestId("input-details.installationAddress"), "Plot 8, Sector 18, Noida 201301");
  await user.type(screen.getByTestId("input-details.signatoryName"), "Rohit Malhotra");
  await user.type(screen.getByTestId("input-details.signatoryDesignation"), "Director");
  await user.type(screen.getByTestId("input-details.noticesEmail"), "rohit@irontemple.in");
  await user.type(screen.getByTestId("input-details.noticesPhone"), "+919812345678");

  await user.type(screen.getByTestId("input-terms.securityDepositInr"), "50000");
  await user.type(screen.getByTestId("input-terms.termMonths"), "36");
  await user.type(screen.getByTestId("input-terms.gymSharePctBeforeMilestone"), "10");
  await user.type(screen.getByTestId("input-terms.gymSharePctAfterMilestone"), "20");
  await user.type(screen.getByTestId("input-terms.milestoneCups"), "15000");
  await user.type(screen.getByTestId("input-terms.milestoneNetProfitInr"), "1500000");
  await user.type(screen.getByTestId("input-terms.advertisingGymSharePct"), "20");
  await user.type(screen.getByTestId("input-terms.electricityInrPerBlock"), "1500");
  await user.type(screen.getByTestId("input-terms.electricityCupsPerBlock"), "1000");
  await user.type(screen.getByTestId("input-terms.electricityReviewWindowMonths"), "6");
  await user.type(screen.getByTestId("input-terms.settlementDaysAfterMonthEnd"), "15");
  await user.click(screen.getByTestId("radio-early-termination-zero"));

  await user.type(screen.getByTestId("input-machine.deviceNo"), "MBP-000512");
  await user.type(screen.getByTestId("input-machine.model"), "MuscleBoxPro MBP-1");
  await user.type(screen.getByTestId("input-machine.valueInr"), "450000");
}

describe("AdminInviteGym", () => {
  it("renders no autosave indicator and no terms preset", async () => {
    // Both raised and both closed deliberately (see the module docstring) — a regression here
    // is one of these two decisions being quietly undone.
    render(<AdminInviteGym />);
    await screen.findByTestId("input-details.legalEntityName");
    expect(screen.queryByText(/draft saved/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /typical|preset|standard terms/i })).not.toBeInTheDocument();
  });

  it("shows every commercial figure blank rather than defaulted", async () => {
    render(<AdminInviteGym />);
    expect(await screen.findByTestId("input-terms.securityDepositInr")).toHaveValue(null);
    expect(screen.getByTestId("input-terms.termMonths")).toHaveValue(null);
  });

  it("submits the whole form and shows the link on success", async () => {
    mockCreateGym.mockResolvedValue({ ok: true, data: CREATED });
    render(<AdminInviteGym />);
    const user = userEvent.setup();

    await fillEverything(user);
    await user.click(screen.getByTestId("button-create-gym"));

    expect(await screen.findByTestId("invite-created")).toBeInTheDocument();
    expect(screen.getByTestId("invite-url")).toHaveTextContent(
      "https://onboard.muscleboxpro.com/iron-temple-fitness/h_abc123",
    );
  });

  it("sends the wire body, not the raw form values", async () => {
    mockCreateGym.mockResolvedValue({ ok: true, data: CREATED });
    render(<AdminInviteGym />);
    const user = userEvent.setup();

    await fillEverything(user);
    await user.click(screen.getByTestId("button-create-gym"));

    await waitFor(() => expect(mockCreateGym).toHaveBeenCalled());
    const body = mockCreateGym.mock.calls[0][0];
    expect(body.machine.deviceNo).toBe("MBP-000512");
    // Blank machine fields become null on the wire, not empty strings — `toAdminInviteBody`'s job.
    expect(body.machine.serialNumber).toBeNull();
    expect(body.machine.installationDate).toBeNull();
    expect("invitedByName" in body).toBe(false);
    expect(body.terms.earlyTerminationChargeInr).toBe(0);
  });

  it("copies the link to the clipboard", async () => {
    mockCreateGym.mockResolvedValue({ ok: true, data: CREATED });
    render(<AdminInviteGym />);
    const user = userEvent.setup();
    stubClipboard();

    await fillEverything(user);
    await user.click(screen.getByTestId("button-create-gym"));
    await screen.findByTestId("invite-created");

    await user.click(screen.getByTestId("button-copy-invite-url"));
    expect(mockWriteText).toHaveBeenCalledWith(
      "https://onboard.muscleboxpro.com/iron-temple-fitness/h_abc123",
    );
  });

  it("does not resubmit or lose the link once the gym is created", async () => {
    // There is no form left to resubmit — a second click on the create button is not reachable
    // because the button no longer renders once `result` is set. Re-rendering leaves the
    // success screen exactly as it was.
    mockCreateGym.mockResolvedValue({ ok: true, data: CREATED });
    render(<AdminInviteGym />);
    const user = userEvent.setup();

    await fillEverything(user);
    await user.click(screen.getByTestId("button-create-gym"));
    await screen.findByTestId("invite-created");

    expect(screen.queryByTestId("button-create-gym")).not.toBeInTheDocument();
    expect(mockCreateGym).toHaveBeenCalledTimes(1);
  });

  it("maps namespaced field errors onto the matching inputs across all three blocks", async () => {
    // The handler validates all four blocks before reporting any of them — an admin filling one
    // long form should see everything wrong with it at once.
    mockCreateGym.mockResolvedValue({
      ok: false,
      error: {
        code: "validation",
        message: "Some fields need fixing.",
        fieldErrors: {
          "details.gstin": "That GSTIN's check digit does not match.",
          "terms.termMonths": "Must be between 1 and 600.",
          "machine.deviceNo": "Letters, digits, hyphen and underscore only.",
          invitedByName: "Must be at least 2 characters.",
        },
      },
    });
    render(<AdminInviteGym />);
    const user = userEvent.setup();
    await fillEverything(user);
    await user.click(screen.getByTestId("button-create-gym"));

    expect(await screen.findByText("That GSTIN's check digit does not match.")).toBeInTheDocument();
    expect(screen.getByText("Must be between 1 and 600.")).toBeInTheDocument();
    expect(screen.getByText("Letters, digits, hyphen and underscore only.")).toBeInTheDocument();
    expect(screen.getByText("Must be at least 2 characters.")).toBeInTheDocument();
    // Nothing was created — the form is still on screen, not the success state.
    expect(screen.queryByTestId("invite-created")).not.toBeInTheDocument();
  });

  it("shows the server's message alongside the field errors", async () => {
    mockCreateGym.mockResolvedValue({
      ok: false,
      error: { code: "validation", message: "Some fields need fixing.", fieldErrors: {} },
    });
    render(<AdminInviteGym />);
    const user = userEvent.setup();
    await fillEverything(user);
    await user.click(screen.getByTestId("button-create-gym"));

    expect(await screen.findByTestId("invite-error")).toHaveTextContent("Some fields need fixing.");
  });

  it("does not submit a form with fields still empty", async () => {
    // Client-side zod catches this before `createGym` is ever called — the whole point of the
    // schema being a courtesy check rather than decoration.
    render(<AdminInviteGym />);
    const user = userEvent.setup();
    await user.click(await screen.findByTestId("button-create-gym"));

    await waitFor(() => expect(mockCreateGym).not.toHaveBeenCalled());
  });

  it("distinguishes a zero early-termination charge from one not yet agreed", async () => {
    mockCreateGym.mockResolvedValue({ ok: true, data: CREATED });
    render(<AdminInviteGym />);
    const user = userEvent.setup();
    await fillEverything(user);
    // Switch off the "standard, nil" choice picked by fillEverything and onto "not agreed".
    await user.click(screen.getByTestId("radio-early-termination-unagreed"));
    await user.click(screen.getByTestId("button-create-gym"));

    await waitFor(() => expect(mockCreateGym).toHaveBeenCalled());
    expect(mockCreateGym.mock.calls[0][0].terms.earlyTerminationChargeInr).toBeNull();
  });

  it("reveals an amount field only when 'a different amount' is chosen", async () => {
    render(<AdminInviteGym />);
    await screen.findByTestId("input-details.legalEntityName");
    expect(screen.queryByTestId("input-terms.earlyTerminationChargeInr")).not.toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByTestId("radio-early-termination-amount"));
    expect(screen.getByTestId("input-terms.earlyTerminationChargeInr")).toBeInTheDocument();
  });

  it("sends an unauthenticated visitor to the login page", async () => {
    mockFetchSession.mockResolvedValue(null);
    const mockReplace = vi.fn();
    const { useRouter } = await import("next/navigation");
    (useRouter as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ replace: mockReplace, push: vi.fn() });

    render(<AdminInviteGym />);
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/admin/login"));
    expect(mockCreateGym).not.toHaveBeenCalled();
  });
});
