import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

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

// The six writes are mocked alongside the read, and they have to be: Vitest's module mock is
// exhaustive, so an export the factory omits throws on import rather than arriving as undefined.
const { mockFetchView, mockPatchTerms, mockPutMachine, mockNotice, mockTerminate } = vi.hoisted(
  () => ({
    mockFetchView: vi.fn(),
    mockPatchTerms: vi.fn(),
    mockPutMachine: vi.fn(),
    mockNotice: vi.fn(),
    mockTerminate: vi.fn(),
  }),
);
vi.mock("@/lib/adminApi", () => ({
  fetchAdminGymView: mockFetchView,
  patchGymTerms: mockPatchTerms,
  putGymMachine: mockPutMachine,
  recordOffboardingNotice: mockNotice,
  terminateGym: mockTerminate,
  recordMachineRecovered: vi.fn(),
  recordOffboardingSettlement: vi.fn(),
  ADMIN_GYMS_QUERY_KEY: ["admin", "gyms"],
  adminGymQueryKey: (gymId: string) => ["admin", "gym", gymId],
}));

vi.mock("@/lib/queryClient", () => ({
  queryClient: { invalidateQueries: vi.fn().mockResolvedValue(undefined), removeQueries: vi.fn() },
}));

import AdminGymDetail from "@/pages/admin/AdminGymDetail";
import { adminGymFixture, adminOffboardingFixture } from "@/test/adminGymFixture";

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

  it("does not show a placeholder device number as a real allocation", async () => {
    // Since 2026-08-23, `POST /admin/gyms` allocates a machine row with a real model and value
    // even when the admin has not chosen a physical unit yet, filling `deviceNo` with a
    // `PENDING-`-prefixed placeholder rather than leaving it null. This is the second trap the
    // `machine` field carries, alongside the zero-valued-projection one above: `deviceNo !== null`
    // is no longer sufficient proof of a real allocation.
    const gym = adminGymFixture();
    gym.machine = {
      model: "MuscleBoxPro MBP-1",
      deviceNo: "PENDING-A1B2C3D4",
      serialNumber: null,
      valueInr: 450_000,
      accessories: "",
      installationDate: null,
    };
    mockFetchView.mockResolvedValue({ ok: true, data: gym });
    render(<AdminGymDetail gymId="gym_01HQZX9K2M4N6P8R" />);

    const card = await screen.findByTestId("card-machine");
    // The known figures still render — this is not the "no unit at all" state.
    expect(card).toHaveTextContent("MuscleBoxPro MBP-1");
    expect(card).toHaveTextContent("₹4,50,000");
    // The raw placeholder string never reaches the screen as if it were a real device number.
    expect(card).not.toHaveTextContent("PENDING-A1B2C3D4");
    expect(card).toHaveTextContent("Pending, not yet chosen");
    expect(screen.queryByTestId("machine-none")).not.toBeInTheDocument();
  });

  it("labels a pending placeholder in the unit history table too", async () => {
    const gym = adminGymFixture();
    gym.machines = [
      {
        deviceNo: "PENDING-A1B2C3D4",
        model: "MuscleBoxPro MBP-1",
        serialNumber: null,
        valueInr: 450_000,
        accessories: "",
        installationDate: null,
        status: "allocated",
        lastServiceAt: null,
        replacedByDeviceNo: null,
        replacedAt: null,
      },
    ];
    gym.machine = { ...gym.machines[0] };
    mockFetchView.mockResolvedValue({ ok: true, data: gym });
    render(<AdminGymDetail gymId="gym_01HQZX9K2M4N6P8R" />);

    const table = await screen.findByTestId("table-machines");
    expect(table).toHaveTextContent("pending");
    expect(table).not.toHaveTextContent("PENDING-A1B2C3D4");
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

  it("says the seven deferred fields are pending when the gym hasn't reached step 1", async () => {
    // Since 2026-08-23 an admin can invite a gym before its legal entity name, entity type,
    // GSTIN, addresses and signatory exist — all blank until `onboardingDetails.ts` commits
    // step 1, and that handler requires a non-blank legal entity name, so blank reliably means
    // "not there yet."
    const gym = adminGymFixture();
    gym.details.legalEntityName = "";
    gym.details.gstin = "";
    gym.details.registeredAddress = "";
    gym.details.installationAddress = "";
    gym.details.signatoryName = "";
    gym.details.signatoryDesignation = "";
    mockFetchView.mockResolvedValue({ ok: true, data: gym });
    render(<AdminGymDetail gymId="gym_01HQZX9K2M4N6P8R" />);

    const card = await screen.findByTestId("card-details");
    expect(card).toHaveTextContent(/hasn't reached step 1/);
    // The blank fields themselves still render, as an em dash rather than a missing row.
    expect(card).toHaveTextContent("—");
  });

  it("shows no pending note once the gym has a legal entity name", async () => {
    mockFetchView.mockResolvedValue({ ok: true, data: adminGymFixture() });
    render(<AdminGymDetail gymId="gym_01HQZX9K2M4N6P8R" />);

    const card = await screen.findByTestId("card-details");
    expect(card).not.toHaveTextContent(/hasn't reached step 1/);
  });

  it("links back to the gyms list", async () => {
    mockFetchView.mockResolvedValue({ ok: true, data: adminGymFixture() });
    render(<AdminGymDetail gymId="gym_01HQZX9K2M4N6P8R" />);

    expect(await screen.findByTestId("link-back-to-gyms")).toHaveAttribute("href", "/admin/gyms");
  });
});

/**
 * The gym's own dashboard, mirrored.
 *
 * The cases here are all about the seven cards that have nothing in them. There is no ingestion from
 * the machines and no settlement job, so a figure on this screen could only have been invented — and
 * an invented figure on an admin screen is one that gets read out to a partner on the phone.
 */
describe("AdminGymDetail — the partner dashboard", () => {
  it("shows the figures the gym cannot see as unavailable, not as zero", async () => {
    mockFetchView.mockResolvedValue({ ok: true, data: adminGymFixture() });
    render(<AdminGymDetail gymId="gym_01HQZX9K2M4N6P8R" />);

    const card = await screen.findByTestId("card-dashboard");
    expect(screen.getByTestId("mirror-cups-unavailable")).toBeInTheDocument();
    expect(screen.getByTestId("mirror-revenue-unavailable")).toBeInTheDocument();
    expect(card).toHaveTextContent("pipeline not built");
    // The one thing a mirrored dashboard must never do: turn "not reported" into a number.
    expect(card).not.toHaveTextContent("₹0");
  });

  it("fills in the three cards it can, from the gym it already has", async () => {
    mockFetchView.mockResolvedValue({ ok: true, data: adminGymFixture() });
    render(<AdminGymDetail gymId="gym_01HQZX9K2M4N6P8R" />);

    expect(await screen.findByTestId("mirror-machine")).toHaveTextContent("Installed");
    expect(screen.getByTestId("mirror-deposit")).toHaveTextContent("₹50,000");
    expect(screen.getByTestId("mirror-agreement")).toHaveTextContent("v2.2");
  });
});

describe("AdminGymDetail — editing the terms", () => {
  it("does not offer to edit terms a signature already covers", async () => {
    // The signature is over a hash of these figures, so `PATCH …/terms` is refused once the gym
    // has signed — by a `ConditionCheck` in the server's transaction. Offering the form anyway
    // would be a button whose only outcome is a 409.
    mockFetchView.mockResolvedValue({ ok: true, data: adminGymFixture() });
    render(<AdminGymDetail gymId="gym_01HQZX9K2M4N6P8R" />);

    expect(await screen.findByTestId("card-terms")).toHaveTextContent(/no longer be edited/);
    expect(screen.queryByTestId("button-edit-terms")).not.toBeInTheDocument();
  });

  it("sends only the figures that changed", async () => {
    // The route patches, but the form is prefilled and complete, so a submission that sent all
    // eleven fields would rewrite ten of them with what they already were — and any concurrent
    // edit with them.
    const gym = adminGymFixture();
    gym.signature = null;
    mockFetchView.mockResolvedValue({ ok: true, data: gym });
    mockPatchTerms.mockResolvedValue({ ok: true, data: { changed: ["securityDepositInr"] } });
    render(<AdminGymDetail gymId="gym_01HQZX9K2M4N6P8R" />);
    const user = userEvent.setup();

    await user.click(await screen.findByTestId("button-edit-terms"));
    // `fireEvent.change` rather than `user.clear` then `user.type`: jsdom does not implement
    // selection on `type="number"`, so `clear` is a silent no-op there and the typed digits land
    // *after* the prefilled ones — ₹5,00,00,60,000, which the form then correctly refuses.
    fireEvent.change(screen.getByTestId("input-securityDepositInr"), {
      target: { value: "60000" },
    });
    await user.click(screen.getByTestId("button-save-terms"));

    await waitFor(() =>
      expect(mockPatchTerms).toHaveBeenCalledWith("gym_01HQZX9K2M4N6P8R", {
        securityDepositInr: 60000,
      }),
    );
    expect(await screen.findByTestId("terms-saved")).toHaveTextContent("securityDepositInr");
  });

  it("says nothing changed rather than letting the server say it", async () => {
    // `PATCH …/terms` refuses an empty patch with "send at least one term", which is a confusing
    // thing to be told after pressing Save on a form you did not edit.
    const gym = adminGymFixture();
    gym.signature = null;
    mockFetchView.mockResolvedValue({ ok: true, data: gym });
    render(<AdminGymDetail gymId="gym_01HQZX9K2M4N6P8R" />);
    const user = userEvent.setup();

    await user.click(await screen.findByTestId("button-edit-terms"));
    await user.click(screen.getByTestId("button-save-terms"));

    expect(await screen.findByTestId("terms-error")).toHaveTextContent("Nothing changed");
    expect(mockPatchTerms).not.toHaveBeenCalled();
  });
});

describe("AdminGymDetail — assigning a machine", () => {
  it("says a different device number will replace the unit, before it does", async () => {
    mockFetchView.mockResolvedValue({ ok: true, data: adminGymFixture() });
    mockPutMachine.mockResolvedValue({
      ok: true,
      data: { gymId: "gym_01HQZX9K2M4N6P8R", deviceNo: "MBP-000999", replaced: true },
    });
    render(<AdminGymDetail gymId="gym_01HQZX9K2M4N6P8R" />);
    const user = userEvent.setup();

    await user.click(await screen.findByTestId("button-edit-machine"));
    await user.clear(screen.getByTestId("input-deviceNo"));
    await user.type(screen.getByTestId("input-deviceNo"), "MBP-000999");
    expect(screen.getByTestId("machine-replace-warning")).toHaveTextContent("MBP-000241");

    await user.click(screen.getByTestId("button-save-machine"));

    // A whole machine, even though only the device number was touched: the route reads the
    // current row to decide between a patch and a replacement, and a partial body naming an
    // unknown device is refused as a typo rather than treated as an assignment.
    await waitFor(() =>
      expect(mockPutMachine).toHaveBeenCalledWith("gym_01HQZX9K2M4N6P8R", {
        deviceNo: "MBP-000999",
        model: "MBP-Pro-1",
        serialNumber: "SN-2026-000241",
        valueInr: 450000,
        accessories: "Cup dispenser, water filter, base cabinet",
        installationDate: "2026-07-10",
        status: "installed",
      }),
    );
    expect(await screen.findByTestId("machine-saved")).toHaveTextContent("Replaced");
  });

  it("starts the device number blank when the one on file is a placeholder", async () => {
    // Prefilling it would make "save without noticing" write a second pending row, and typing the
    // number off the unit is the entire reason for the visit.
    const gym = adminGymFixture();
    gym.machine = { ...gym.machine, deviceNo: "PENDING-A1B2C3D4", installationDate: null };
    mockFetchView.mockResolvedValue({ ok: true, data: gym });
    render(<AdminGymDetail gymId="gym_01HQZX9K2M4N6P8R" />);
    const user = userEvent.setup();

    await user.click(await screen.findByTestId("button-edit-machine"));
    expect(screen.getByTestId("input-deviceNo")).toHaveValue("");
    // The model and value are prefilled, because those were real when the gym was created.
    expect(screen.getByTestId("input-model")).toHaveValue("MBP-Pro-1");
  });
});

describe("AdminGymDetail — offboarding", () => {
  it("offers only the rung the ladder allows", async () => {
    mockFetchView.mockResolvedValue({ ok: true, data: adminGymFixture() });
    render(<AdminGymDetail gymId="gym_01HQZX9K2M4N6P8R" />);

    // Nothing recorded: a notice may never arrive (breach, mutual, expiry), so terminate is
    // offered beside it from the start.
    expect(await screen.findByTestId("button-open-notice")).toBeInTheDocument();
    expect(screen.getByTestId("button-open-terminate")).toBeInTheDocument();
    // The two rungs the server would refuse are not on screen at all.
    expect(screen.queryByTestId("button-open-recovered")).not.toBeInTheDocument();
    expect(screen.queryByTestId("button-open-settlement")).not.toBeInTheDocument();
  });

  it("moves to recovery once the agreement has ended", async () => {
    const gym = adminGymFixture();
    gym.offboarding = {
      ...adminOffboardingFixture(),
      state: "terminated",
      machineRecoveredAt: null,
      machineRecoveredByEmail: null,
      recoveredDeviceNo: null,
      machineCondition: null,
      settlement: null,
      settledAt: null,
    };
    mockFetchView.mockResolvedValue({ ok: true, data: gym });
    render(<AdminGymDetail gymId="gym_01HQZX9K2M4N6P8R" />);

    expect(await screen.findByTestId("button-open-recovered")).toBeInTheDocument();
    expect(screen.queryByTestId("button-open-terminate")).not.toBeInTheDocument();
    // And the state is visible at the top, not only in the section: an admin who does not know
    // the agreement has ended reads every section above as if it were live.
    expect(screen.getByTestId("gym-ended")).toHaveTextContent("terminated");
  });

  it("offers nothing to a gym that never signed", async () => {
    const gym = adminGymFixture();
    gym.signature = null;
    mockFetchView.mockResolvedValue({ ok: true, data: gym });
    render(<AdminGymDetail gymId="gym_01HQZX9K2M4N6P8R" />);

    expect(await screen.findByTestId("offboarding-none")).toHaveTextContent("Nothing to end");
    expect(screen.queryByTestId("button-open-terminate")).not.toBeInTheDocument();
  });

  it("records a settlement to the paise and says nobody has been paid", async () => {
    // The payable is the one figure reconciled against a Razorpay statement, so it is not
    // rounded — and it is a figure somebody still has to pay by hand, which the card has to say
    // out loud beside it.
    const gym = adminGymFixture();
    gym.offboarding = adminOffboardingFixture();
    mockFetchView.mockResolvedValue({ ok: true, data: gym });
    render(<AdminGymDetail gymId="gym_01HQZX9K2M4N6P8R" />);

    const card = await screen.findByTestId("card-offboarding");
    expect(card).toHaveTextContent("₹41,500.00");
    expect(screen.getByTestId("settlement-not-paid")).toHaveTextContent("Recorded, not paid");
    expect(screen.getByTestId("table-deductions")).toHaveTextContent("Damage (§35)");
    // Settled is terminal: there is no further rung and the card says so rather than showing an
    // empty footer.
    expect(screen.getByTestId("offboarding-complete")).toBeInTheDocument();
  });

  it("records a notice against the date on the letter", async () => {
    mockFetchView.mockResolvedValue({ ok: true, data: adminGymFixture() });
    mockNotice.mockResolvedValue({
      ok: true,
      data: {
        offboarding: {
          ...adminOffboardingFixture(),
          state: "notice_served",
        },
      },
    });
    render(<AdminGymDetail gymId="gym_01HQZX9K2M4N6P8R" />);
    const user = userEvent.setup();

    await user.click(await screen.findByTestId("button-open-notice"));
    await user.type(screen.getByTestId("input-receivedOn"), "2026-08-01");
    await user.type(screen.getByTestId("input-channel"), "Email to ops@");
    await user.click(screen.getByTestId("button-save-notice"));

    await waitFor(() =>
      expect(mockNotice).toHaveBeenCalledWith("gym_01HQZX9K2M4N6P8R", {
        receivedOn: "2026-08-01",
        channel: "Email to ops@",
      }),
    );
    // §36.1's thirty days are counted server-side, and the confirmation quotes the date it
    // answered with rather than one computed here.
    expect(await screen.findByTestId("offboarding-saved")).toHaveTextContent("01 Sept 2026");
  });

  it("will not terminate without a cause", async () => {
    // Four causes, and picking the wrong one changes what may be deducted from money we hold.
    // So the select starts blank, and a blank is refused here rather than at the server.
    mockFetchView.mockResolvedValue({ ok: true, data: adminGymFixture() });
    render(<AdminGymDetail gymId="gym_01HQZX9K2M4N6P8R" />);
    const user = userEvent.setup();

    await user.click(await screen.findByTestId("button-open-terminate"));
    await user.click(screen.getByTestId("button-save-terminate"));

    expect(await screen.findByText("Choose a cause.")).toBeInTheDocument();
    expect(mockTerminate).not.toHaveBeenCalled();
  });
});
