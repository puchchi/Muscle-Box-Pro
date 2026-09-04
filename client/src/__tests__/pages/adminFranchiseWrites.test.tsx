import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

/**
 * The franchise detail page's three writes, as the two components that own them.
 *
 * The components rather than the page, because what is worth pinning here is not routing or
 * fetching — `adminFranchiseApi.test.ts` owns the seam and `admin-gyms-schema.test.ts`'s sibling owns
 * the parse — but the four decisions these two screens make on their own:
 *
 * 1. **The terms lock reads `timestamps.signedAt`, not `status`.** The status ladder moves past
 *    `signed` at step 8, so a status check would re-open the form for a franchise that has signed and
 *    then claimed its instalment.
 * 2. **Clearing the schedule sends `null`, never `[]`.** The server refuses the empty array; null is
 *    "no schedule agreed", which is a state the term sheet cannot be issued from on purpose.
 * 3. **A field error naming `tier` shows in the banner.** There is no tier input to hang it on, and
 *    attaching it to whichever input sorts first would blame the wrong figure.
 * 4. **A resend is destructive and asks first,** and the URL it answers with is the only copy that
 *    will ever exist.
 */

const { mockPatchTerms, mockResend, mockVoid } = vi.hoisted(() => ({
  mockPatchTerms: vi.fn(),
  mockResend: vi.fn(),
  mockVoid: vi.fn(),
}));
vi.mock("@/lib/adminFranchiseApi", () => ({
  patchFranchiseTerms: mockPatchTerms,
  resendFranchiseInvite: mockResend,
  voidFranchiseInvite: mockVoid,
}));

import { AdminFranchiseTermsEditor } from "@/pages/admin/AdminFranchiseTermsEditor";
import { FranchiseInviteActions } from "@/pages/admin/AdminFranchiseInviteActions";
import { adminFranchiseFixture } from "@/test/adminFranchiseFixture";
import type { AdminFranchiseView } from "@shared/admin/franchises";

const FRANCHISE_ID = "b7e2c1a4-9f38-4d6b-8e05-3c1f7a2d9b64";

/** The fixture is signed and paid, so every editing test starts by undoing the signature. */
function unsigned(): AdminFranchiseView {
  const franchise = adminFranchiseFixture();
  franchise.timestamps.signedAt = null;
  franchise.timestamps.paymentClaimedAt = null;
  franchise.status = "approved";
  return franchise;
}

function patched(changed: string[]) {
  return { ok: true, data: { ...adminFranchiseFixture(), changed } };
}

/**
 * A franchise whose link has not lapsed yet.
 *
 * Relative to now rather than a literal date, because the fixture's own token expires 27 Aug 2026
 * and every assertion about "the link they are holding" would silently invert the day it passes.
 */
function withLiveInvite(): AdminFranchiseView {
  const franchise = adminFranchiseFixture();
  franchise.invite = {
    ...franchise.invite!,
    revokedAt: null,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  };
  return franchise;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("AdminFranchiseTermsEditor — the lock", () => {
  it("does not offer to edit terms a signature already covers", async () => {
    render(<AdminFranchiseTermsEditor franchise={adminFranchiseFixture()} onSaved={vi.fn()} />);

    expect(await screen.findByTestId("card-terms")).toHaveTextContent(/no longer be edited/);
    expect(screen.queryByTestId("button-edit-franchise-terms")).not.toBeInTheDocument();
  });

  it("stays locked once the franchise has moved past signing", () => {
    // The fixture is `payment_claimed`, which is *after* `signed`. A lock derived from the status
    // would re-open this form at exactly the point the figures are being paid against.
    const franchise = adminFranchiseFixture();
    expect(franchise.status).toBe("payment_claimed");
    render(<AdminFranchiseTermsEditor franchise={franchise} onSaved={vi.fn()} />);

    expect(screen.queryByTestId("button-edit-franchise-terms")).not.toBeInTheDocument();
  });

  it("offers the form before a signature, which is the ordinary case", () => {
    render(<AdminFranchiseTermsEditor franchise={unsigned()} onSaved={vi.fn()} />);
    expect(screen.getByTestId("button-edit-franchise-terms")).toBeInTheDocument();
  });

  it("shows the tier without offering to change it", () => {
    // §3 finalises the tier with the territory and records it on the `TERRITORY` row. A tier select
    // here would be free to disagree with the tier the term sheet actually names.
    render(<AdminFranchiseTermsEditor franchise={unsigned()} onSaved={vi.fn()} />);
    expect(screen.getByTestId("card-terms")).toHaveTextContent(/tier is set with the territory/i);
    expect(screen.queryByTestId("input-tier")).not.toBeInTheDocument();
  });
});

describe("AdminFranchiseTermsEditor — saving", () => {
  it("sends only the figure that changed", async () => {
    mockPatchTerms.mockResolvedValue(patched(["machines"]));
    render(<AdminFranchiseTermsEditor franchise={unsigned()} onSaved={vi.fn()} />);
    const user = userEvent.setup();

    await user.click(screen.getByTestId("button-edit-franchise-terms"));
    // `fireEvent.change` rather than clear-then-type: jsdom does not implement selection on
    // `type="number"`, so `clear` is a no-op and the digits land after the prefilled ones.
    fireEvent.change(screen.getByTestId("input-machineAllocation"), { target: { value: "6" } });
    await user.click(screen.getByTestId("button-save-franchise-terms"));

    await waitFor(() =>
      expect(mockPatchTerms).toHaveBeenCalledWith(FRANCHISE_ID, { machineAllocation: 6 }),
    );
    expect(await screen.findByTestId("franchise-terms-saved")).toHaveTextContent("machines");
  });

  it("converts the rupees on the form into the paise on the wire", async () => {
    mockPatchTerms.mockResolvedValue(patched(["investment"]));
    render(<AdminFranchiseTermsEditor franchise={unsigned()} onSaved={vi.fn()} />);
    const user = userEvent.setup();

    await user.click(screen.getByTestId("button-edit-franchise-terms"));
    fireEvent.change(screen.getByTestId("input-investmentInr"), { target: { value: "2600000" } });
    await user.click(screen.getByTestId("button-save-franchise-terms"));

    await waitFor(() =>
      expect(mockPatchTerms).toHaveBeenCalledWith(FRANCHISE_ID, { investmentPaise: 260_000_000 }),
    );
  });

  it("says nothing changed rather than letting the server say it", async () => {
    render(<AdminFranchiseTermsEditor franchise={unsigned()} onSaved={vi.fn()} />);
    const user = userEvent.setup();

    await user.click(screen.getByTestId("button-edit-franchise-terms"));
    await user.click(screen.getByTestId("button-save-franchise-terms"));

    expect(await screen.findByTestId("franchise-terms-error")).toHaveTextContent("Nothing changed");
    expect(mockPatchTerms).not.toHaveBeenCalled();
  });

  it("sends null for a cleared schedule, not an empty list", async () => {
    // The server refuses `[]`. Null is "no schedule agreed", which is why clearing is its own button
    // rather than removing the last row.
    mockPatchTerms.mockResolvedValue(patched(["instalment schedule"]));
    render(<AdminFranchiseTermsEditor franchise={unsigned()} onSaved={vi.fn()} />);
    const user = userEvent.setup();

    await user.click(screen.getByTestId("button-edit-franchise-terms"));
    await user.click(screen.getByTestId("button-clear-schedule"));
    await user.click(screen.getByTestId("button-save-franchise-terms"));

    await waitFor(() =>
      expect(mockPatchTerms).toHaveBeenCalledWith(FRANCHISE_ID, { paymentSchedule: null }),
    );
  });

  it("says outright that a cleared schedule cannot be issued", async () => {
    render(<AdminFranchiseTermsEditor franchise={unsigned()} onSaved={vi.fn()} />);
    const user = userEvent.setup();

    await user.click(screen.getByTestId("button-edit-franchise-terms"));
    await user.click(screen.getByTestId("button-clear-schedule"));

    expect(screen.getByTestId("button-add-schedule")).toBeInTheDocument();
    expect(screen.getByText(/cannot\s+be issued at all/i)).toBeInTheDocument();
  });

  it("refuses a schedule that does not add up before sending it", async () => {
    // 10% of the consideration no instalment would ever ask for, and the server would refuse it
    // anyway. Refusing here means the admin is told with the figures still in front of them.
    render(<AdminFranchiseTermsEditor franchise={unsigned()} onSaved={vi.fn()} />);
    const user = userEvent.setup();

    await user.click(screen.getByTestId("button-edit-franchise-terms"));
    fireEvent.change(screen.getByTestId("input-paymentSchedule.0.pct"), {
      target: { value: "40" },
    });
    await user.click(screen.getByTestId("button-save-franchise-terms"));

    expect(await screen.findByTestId("schedule-error")).toHaveTextContent("add up to 90%");
    expect(mockPatchTerms).not.toHaveBeenCalled();
  });

  it("keeps a running total in front of the admin as they edit", async () => {
    render(<AdminFranchiseTermsEditor franchise={unsigned()} onSaved={vi.fn()} />);
    const user = userEvent.setup();

    await user.click(screen.getByTestId("button-edit-franchise-terms"));
    expect(screen.getByTestId("schedule-total")).toHaveTextContent("100% across 2 stages");
    expect(screen.getByTestId("schedule-total")).not.toHaveTextContent("needs 100%");

    fireEvent.change(screen.getByTestId("input-paymentSchedule.1.pct"), {
      target: { value: "30" },
    });
    expect(screen.getByTestId("schedule-total")).toHaveTextContent("80% across 2 stages");
    expect(screen.getByTestId("schedule-total")).toHaveTextContent("needs 100%");
  });

  it("shows a tier field error in the banner, since there is no tier input to hang it on", async () => {
    mockPatchTerms.mockResolvedValue({
      ok: false,
      error: {
        code: "validation",
        message: "The tier is set with the territory grant, not here.",
        fieldErrors: { tier: "Not editable on this route." },
      },
      issues: [],
    });
    render(<AdminFranchiseTermsEditor franchise={unsigned()} onSaved={vi.fn()} />);
    const user = userEvent.setup();

    await user.click(screen.getByTestId("button-edit-franchise-terms"));
    fireEvent.change(screen.getByTestId("input-machineAllocation"), { target: { value: "6" } });
    await user.click(screen.getByTestId("button-save-franchise-terms"));

    expect(await screen.findByTestId("franchise-terms-error")).toHaveTextContent(
      "The tier is set with the territory grant",
    );
    // Still editing, so the admin can change something the server will accept.
    expect(screen.getByTestId("button-save-franchise-terms")).toBeInTheDocument();
  });

  it("attaches a per-stage field error to the stage it names", async () => {
    // The route addresses it `paymentSchedule[1].trigger` and the input is registered
    // `paymentSchedule.1.trigger`. Sent as-is, the message would land on a field nobody watches.
    mockPatchTerms.mockResolvedValue({
      ok: false,
      error: {
        code: "validation",
        message: "Some fields need fixing.",
        fieldErrors: { "paymentSchedule[1].trigger": "Say what triggers this instalment." },
      },
      issues: [],
    });
    render(<AdminFranchiseTermsEditor franchise={unsigned()} onSaved={vi.fn()} />);
    const user = userEvent.setup();

    await user.click(screen.getByTestId("button-edit-franchise-terms"));
    fireEvent.change(screen.getByTestId("input-machineAllocation"), { target: { value: "6" } });
    await user.click(screen.getByTestId("button-save-franchise-terms"));

    expect(await screen.findByText("Say what triggers this instalment.")).toBeInTheDocument();
  });

  it("offers 'not agreed' for the recovery threshold and sends null for it", async () => {
    // Null is "agreement-specific, not yet agreed" and zero is "recovered from the first rupee".
    // A blank printing as ₹0 on a term sheet is how a placeholder becomes a term nobody chose.
    mockPatchTerms.mockResolvedValue(patched(["capital recovery threshold"]));
    render(<AdminFranchiseTermsEditor franchise={unsigned()} onSaved={vi.fn()} />);
    const user = userEvent.setup();

    await user.click(screen.getByTestId("button-edit-franchise-terms"));
    await user.click(screen.getByTestId("radio-recovery-unagreed"));
    await user.click(screen.getByTestId("button-save-franchise-terms"));

    await waitFor(() =>
      expect(mockPatchTerms).toHaveBeenCalledWith(FRANCHISE_ID, { capitalRecoveryPaise: null }),
    );
  });

  it("refetches the franchise after a save, because the server derives what it answers with", async () => {
    const onSaved = vi.fn();
    mockPatchTerms.mockResolvedValue(patched(["machines"]));
    render(<AdminFranchiseTermsEditor franchise={unsigned()} onSaved={onSaved} />);
    const user = userEvent.setup();

    await user.click(screen.getByTestId("button-edit-franchise-terms"));
    fireEvent.change(screen.getByTestId("input-machineAllocation"), { target: { value: "6" } });
    await user.click(screen.getByTestId("button-save-franchise-terms"));

    await waitFor(() => expect(onSaved).toHaveBeenCalled());
  });
});

describe("FranchiseInviteActions — resending", () => {
  const RESEND = {
    ok: true as const,
    data: {
      ...adminFranchiseFixture(),
      onboardingUrl:
        "https://muscleboxpro.com/franchise/onboarding/northline-nutrition/7d1e4b93c2a86045f9b3e7c1a5d20468",
      tokenId: "1f93b8c4-52ea-4d07-9b16-8c40a5e71d29",
      expiresAt: "2026-10-04T05:12:00.000Z",
      emailed: true,
    },
  };

  it("asks before revoking the link the franchisee is holding", async () => {
    render(<FranchiseInviteActions franchise={withLiveInvite()} onChanged={vi.fn()} />);
    const user = userEvent.setup();

    await user.click(screen.getByTestId("button-resend-invite"));

    expect(screen.getByTestId("confirm-resend")).toHaveTextContent(/stops working immediately/);
    expect(mockResend).not.toHaveBeenCalled();
  });

  it("does not warn about breaking a link that has already lapsed", async () => {
    // An expired token is nothing to lose, and warning about it is the sentence that makes an admin
    // hesitate over a resend there is no reason to hesitate over.
    const franchise = adminFranchiseFixture();
    franchise.invite = { ...franchise.invite!, expiresAt: "2026-08-27T05:12:00.000Z" };
    render(<FranchiseInviteActions franchise={franchise} onChanged={vi.fn()} />);
    const user = userEvent.setup();

    expect(screen.getByText(/No live link on record/)).toBeInTheDocument();
    await user.click(screen.getByTestId("button-resend-invite"));
    expect(screen.getByTestId("confirm-resend")).toHaveTextContent(/nothing here is lost/);
  });

  it("sends no name by default, so the server keeps the one they already know", async () => {
    mockResend.mockResolvedValue(RESEND);
    render(<FranchiseInviteActions franchise={adminFranchiseFixture()} onChanged={vi.fn()} />);
    const user = userEvent.setup();

    await user.click(screen.getByTestId("button-resend-invite"));
    await user.click(screen.getByTestId("button-confirm-resend"));

    await waitFor(() =>
      expect(mockResend).toHaveBeenCalledWith(FRANCHISE_ID, { sendInvite: true }),
    );
  });

  it("sends a name when the contact has actually changed", async () => {
    mockResend.mockResolvedValue(RESEND);
    render(<FranchiseInviteActions franchise={adminFranchiseFixture()} onChanged={vi.fn()} />);
    const user = userEvent.setup();

    await user.click(screen.getByTestId("button-resend-invite"));
    await user.type(screen.getByTestId("input-invited-by-name"), "  Anurag  ");
    await user.click(screen.getByTestId("button-confirm-resend"));

    await waitFor(() =>
      expect(mockResend).toHaveBeenCalledWith(FRANCHISE_ID, {
        invitedByName: "Anurag",
        sendInvite: true,
      }),
    );
  });

  it("mints without mailing when the admin unticks the email", async () => {
    mockResend.mockResolvedValue({ ...RESEND, data: { ...RESEND.data, emailed: false } });
    render(<FranchiseInviteActions franchise={adminFranchiseFixture()} onChanged={vi.fn()} />);
    const user = userEvent.setup();

    await user.click(screen.getByTestId("button-resend-invite"));
    await user.click(screen.getByTestId("checkbox-send-invite"));
    await user.click(screen.getByTestId("button-confirm-resend"));

    await waitFor(() =>
      expect(mockResend).toHaveBeenCalledWith(FRANCHISE_ID, { sendInvite: false }),
    );
  });

  it("shows the URL, because this response is the only place it exists", async () => {
    // The server stores `sha256(handle)` and no handle. Nothing can show this again, so it renders
    // in a selectable input with the expiry beside it and says as much.
    mockResend.mockResolvedValue(RESEND);
    render(<FranchiseInviteActions franchise={adminFranchiseFixture()} onChanged={vi.fn()} />);
    const user = userEvent.setup();

    await user.click(screen.getByTestId("button-resend-invite"));
    await user.click(screen.getByTestId("button-confirm-resend"));

    const url = await screen.findByTestId("input-onboarding-url");
    expect(url).toHaveValue(RESEND.data.onboardingUrl);
    expect(screen.getByTestId("invite-resent")).toHaveTextContent(/only time this link can be read/);
  });

  it("reports a link that was minted and not mailed, with the reason", async () => {
    mockResend.mockResolvedValue({
      ...RESEND,
      data: { ...RESEND.data, emailed: false, emailReason: "SES rejected the recipient." },
    });
    render(<FranchiseInviteActions franchise={adminFranchiseFixture()} onChanged={vi.fn()} />);
    const user = userEvent.setup();

    await user.click(screen.getByTestId("button-resend-invite"));
    await user.click(screen.getByTestId("button-confirm-resend"));

    expect(await screen.findByTestId("invite-email-failed")).toHaveTextContent(
      "SES rejected the recipient.",
    );
    // The link is still live, and it is still the only copy.
    expect(screen.getByTestId("input-onboarding-url")).toHaveValue(RESEND.data.onboardingUrl);
  });

  it("keeps the failure on screen and does not claim a link was issued", async () => {
    mockResend.mockResolvedValue({
      ok: false,
      error: { code: "network", message: "Could not reach the server." },
      issues: [],
    });
    render(<FranchiseInviteActions franchise={adminFranchiseFixture()} onChanged={vi.fn()} />);
    const user = userEvent.setup();

    await user.click(screen.getByTestId("button-resend-invite"));
    await user.click(screen.getByTestId("button-confirm-resend"));

    expect(await screen.findByTestId("invite-action-error")).toHaveTextContent(
      "Could not reach the server.",
    );
    expect(screen.queryByTestId("input-onboarding-url")).not.toBeInTheDocument();
  });

  it("lets the admin dismiss the link once they have it", async () => {
    mockResend.mockResolvedValue(RESEND);
    render(<FranchiseInviteActions franchise={adminFranchiseFixture()} onChanged={vi.fn()} />);
    const user = userEvent.setup();

    await user.click(screen.getByTestId("button-resend-invite"));
    await user.click(screen.getByTestId("button-confirm-resend"));
    await user.click(await screen.findByTestId("button-dismiss-invite-url"));

    expect(screen.queryByTestId("input-onboarding-url")).not.toBeInTheDocument();
  });
});

describe("FranchiseInviteActions — revoking", () => {
  it("asks first, and says what the link is at the far end of", async () => {
    render(<FranchiseInviteActions franchise={adminFranchiseFixture()} onChanged={vi.fn()} />);
    const user = userEvent.setup();

    await user.click(screen.getByTestId("button-void-invite"));

    expect(screen.getByTestId("confirm-void")).toHaveTextContent(/Aadhaar/);
    expect(mockVoid).not.toHaveBeenCalled();
  });

  it("revokes on confirmation and says the link is dead", async () => {
    mockVoid.mockResolvedValue({ ok: true, data: { ...adminFranchiseFixture(), wasLive: true } });
    render(<FranchiseInviteActions franchise={adminFranchiseFixture()} onChanged={vi.fn()} />);
    const user = userEvent.setup();

    await user.click(screen.getByTestId("button-void-invite"));
    await user.click(screen.getByTestId("button-confirm-void"));

    await waitFor(() => expect(mockVoid).toHaveBeenCalledWith(FRANCHISE_ID));
    expect(await screen.findByTestId("invite-voided")).toHaveTextContent("has been revoked");
  });

  it("says the exposure is still open when there was no token to revoke", async () => {
    // `createInvitedFranchise` only began storing `currentTokenHash` on 2026-09-04, so an older
    // franchise has a working link we cannot address. Reporting that as done would be a lie.
    mockVoid.mockResolvedValue({ ok: true, data: { ...adminFranchiseFixture(), wasLive: false } });
    const franchise = adminFranchiseFixture();
    franchise.invite = null;
    render(<FranchiseInviteActions franchise={franchise} onChanged={vi.fn()} />);
    const user = userEvent.setup();

    await user.click(screen.getByTestId("button-void-invite"));
    await user.click(screen.getByTestId("button-confirm-void"));

    const said = await screen.findByTestId("invite-voided");
    expect(said).toHaveTextContent("keeps working until it expires");
    expect(said).toHaveTextContent("Send a new one");
  });

  it("still offers both buttons for a franchise whose token we never stored", () => {
    const franchise = adminFranchiseFixture();
    franchise.invite = null;
    render(<FranchiseInviteActions franchise={franchise} onChanged={vi.fn()} />);

    expect(screen.getByTestId("button-resend-invite")).toBeInTheDocument();
    expect(screen.getByTestId("button-void-invite")).toBeInTheDocument();
    expect(screen.getByText(/No live link on record/)).toBeInTheDocument();
  });
});
