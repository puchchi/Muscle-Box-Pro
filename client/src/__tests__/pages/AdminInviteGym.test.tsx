import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

/**
 * The invite form.
 *
 * Mocked at the guard and at `createGym`, the same division as the other admin page tests: what
 * this page owns is filling the form, mapping namespaced server errors back onto the right
 * inputs, and showing the link exactly once — not the transport or the schema, covered
 * elsewhere. Most of what used to need filling here is now prefilled or removed (2026-08-23):
 * legal entity name, entity type, GSTIN, both addresses and the signatory moved to the gym's
 * own step 1, and every commercial term now starts at `PARTNERSHIP`'s standard figures. So
 * `fillEverything` only has four fields left to type, and the tests that used to fill a long
 * form now assert what is prefilled instead.
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

/**
 * Fill what the schema still requires and nothing else, so the happy-path tests reach
 * `createGym` at all. Terms and the whole machine block (model and value) all start prefilled
 * and valid (`PARTNERSHIP`'s standard figures, and the mock/fixture book value) — this is the
 * whole reason there is so little left to type.
 */
async function fillEverything(user: ReturnType<typeof userEvent.setup>) {
  await user.type(await screen.findByTestId("input-details.tradeName"), "Iron Temple Fitness");
  await user.type(screen.getByTestId("input-details.noticesEmail"), "rohit@irontemple.in");
  await user.type(screen.getByTestId("input-details.noticesPhone"), "+919812345678");
}

describe("AdminInviteGym", () => {
  it("renders no autosave indicator and no separate terms-preset button", async () => {
    // No autosave was raised and closed deliberately; the terms preset was raised, closed, and
    // then reopened as a prefilled-and-editable default rather than a button — see the module
    // docstring. A regression here is either of those being quietly undone.
    render(<AdminInviteGym />);
    await screen.findByTestId("input-details.tradeName");
    expect(screen.queryByText(/draft saved/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /typical|preset|standard terms/i })).not.toBeInTheDocument();
  });

  it("says the seven deferred fields are collected from the gym at step 1", async () => {
    render(<AdminInviteGym />);
    expect(await screen.findByTestId("deferred-fields-note")).toHaveTextContent(/GSTIN/);
    expect(
      screen.queryByTestId("input-details.legalEntityName"),
      "legal entity name should no longer be on this form",
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId("input-details.gstin")).not.toBeInTheDocument();
    expect(screen.queryByTestId("input-details.registeredAddress")).not.toBeInTheDocument();
    expect(screen.queryByTestId("input-details.installationAddress")).not.toBeInTheDocument();
    expect(screen.queryByTestId("input-details.signatoryName")).not.toBeInTheDocument();
    expect(screen.queryByTestId("input-details.signatoryDesignation")).not.toBeInTheDocument();
    expect(screen.queryByTestId("select-entity-type")).not.toBeInTheDocument();
    expect(screen.queryByTestId("input-details.fssaiLicenceNumber")).not.toBeInTheDocument();
    // The four machine logistics fields, deferred the same day for a related reason — see the
    // module docstring's note on `adminInviteMachineSchema`.
    expect(screen.queryByTestId("input-machine.deviceNo")).not.toBeInTheDocument();
    expect(screen.queryByTestId("input-machine.serialNumber")).not.toBeInTheDocument();
    expect(screen.queryByTestId("input-machine.accessories")).not.toBeInTheDocument();
    expect(screen.queryByTestId("input-machine.installationDate")).not.toBeInTheDocument();
  });

  it("prefills every commercial figure with the standard partnership terms", async () => {
    // The reversal of the earlier "no defaults" decision — see the module docstring on why a
    // prefilled, editable value is not the preset button that was ruled out. These figures are
    // `PARTNERSHIP`'s own, not invented for the test.
    render(<AdminInviteGym />);
    expect(await screen.findByTestId("input-terms.securityDepositInr")).toHaveValue(50_000);
    expect(screen.getByTestId("input-terms.termMonths")).toHaveValue(24);
    expect(screen.getByTestId("input-terms.gymSharePctBeforeMilestone")).toHaveValue(20);
    expect(screen.getByTestId("input-terms.gymSharePctAfterMilestone")).toHaveValue(50);
    expect(screen.getByTestId("input-terms.milestoneCups")).toHaveValue(15_000);
    expect(screen.getByTestId("input-terms.milestoneNetProfitInr")).toHaveValue(500_000);
    expect(screen.getByTestId("input-terms.advertisingGymSharePct")).toHaveValue(20);
    expect(screen.getByTestId("input-terms.electricityInrPerBlock")).toHaveValue(1_000);
    expect(screen.getByTestId("input-terms.electricityCupsPerBlock")).toHaveValue(1_000);
    expect(screen.getByTestId("input-terms.electricityReviewWindowMonths")).toHaveValue(3);
    expect(screen.getByTestId("input-terms.settlementDaysAfterMonthEnd")).toHaveValue(15);
    // The standard term is nil, so the "Standard" radio is the one selected by default.
    expect(screen.getByTestId("radio-early-termination-zero")).toBeChecked();
  });

  it("prefills the machine model and value with a plausible default, still editable", async () => {
    render(<AdminInviteGym />);
    expect(await screen.findByTestId("input-machine.model")).toHaveValue("MuscleBoxPro MBP-1");
    expect(screen.getByTestId("input-machine.valueInr")).toHaveValue(500_000);
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
    // Only model and value on the wire for the machine — nothing about device number, serial
    // number, accessories or installation date, which this form never collects at all.
    expect(body.machine).toEqual({ model: "MuscleBoxPro MBP-1", valueInr: 500_000 });
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

  it("maps namespaced field errors onto the matching inputs across every visible block", async () => {
    // The handler validates all four blocks before reporting any of them — an admin filling one
    // long form should see everything wrong with it at once. `details.noticesEmail` and
    // `machine.valueInr` stand in for their blocks here rather than `details.gstin` or
    // `machine.deviceNo`: both of those are among the fields that no longer have a visible
    // input, so a server error on either — which can still happen, if some other path somehow
    // carried one through — would have nowhere on screen to land, and that is a real (if
    // unlikely) gap `setError` alone can't paper over. It is not this test's job to fix that;
    // it is this test's job to prove the fields that *are* visible each get their own message.
    mockCreateGym.mockResolvedValue({
      ok: false,
      error: {
        code: "validation",
        message: "Some fields need fixing.",
        fieldErrors: {
          "details.noticesEmail": "That does not look like an email address.",
          "terms.termMonths": "Must be between 1 and 600.",
          "machine.valueInr": "Must be at most ₹10,00,00,000.",
          invitedByName: "Must be at least 2 characters.",
        },
      },
    });
    render(<AdminInviteGym />);
    const user = userEvent.setup();
    await fillEverything(user);
    await user.click(screen.getByTestId("button-create-gym"));

    expect(await screen.findByText("That does not look like an email address.")).toBeInTheDocument();
    expect(screen.getByText("Must be between 1 and 600.")).toBeInTheDocument();
    expect(screen.getByText("Must be at most ₹10,00,00,000.")).toBeInTheDocument();
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
    await screen.findByTestId("input-details.tradeName");
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
