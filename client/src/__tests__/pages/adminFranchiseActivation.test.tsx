import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { mockActivate } = vi.hoisted(() => ({ mockActivate: vi.fn() }));
vi.mock("@/lib/adminFranchiseApi", () => ({ activateFranchise: mockActivate }));

import { FranchiseActivationCard, franchiseActivationContext } from "@/pages/admin/FranchiseActivationCard";
import { adminFranchiseFixture } from "@/test/adminFranchiseFixture";
import type { AdminFranchiseView } from "@shared/admin/franchises";

function franchise(over: Partial<AdminFranchiseView> = {}, timestamps: Partial<AdminFranchiseView["timestamps"]> = {}): AdminFranchiseView {
  const base = adminFranchiseFixture();
  return { ...base, ...over, timestamps: { ...base.timestamps, ...timestamps } };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("franchiseActivationContext", () => {
  it("says what is unfinished without blocking", () => {
    expect(franchiseActivationContext(franchise({}, { signedAt: null }))[0]).toMatch(/haven't signed/);
    expect(franchiseActivationContext(franchise())[0]).toMatch(/isn't confirmed yet/);
    expect(franchiseActivationContext(franchise({}, { paymentVerifiedAt: "2026-08-25T06:00:00.000Z" }))[0]).toMatch(/is confirmed/);
  });

  it("mentions a missing portal login", () => {
    expect(franchiseActivationContext(franchise()).join(" ")).toMatch(/no portal login/);
    expect(franchiseActivationContext(franchise({}, { accountCreatedAt: "2026-08-26T06:00:00.000Z" })).join(" ")).not.toMatch(/login/);
  });
});

describe("FranchiseActivationCard", () => {
  it("activates an unsigned franchise after asking, with the email choice", async () => {
    const onChanged = vi.fn();
    mockActivate.mockResolvedValue({ ok: true, data: { franchise: franchise(), changed: true, emailed: true } });
    const start = franchise({ status: "approved" }, { signedAt: null });
    render(<FranchiseActivationCard franchise={start} onChanged={onChanged} />);

    await userEvent.click(screen.getByTestId("checkbox-notify-franchise"));
    await userEvent.click(screen.getByTestId("button-activate-franchise"));
    expect(mockActivate).not.toHaveBeenCalled();
    await userEvent.click(screen.getByTestId("button-confirm-activate-franchise"));

    expect(mockActivate).toHaveBeenCalledWith(start.franchiseId, { notify: false });
    expect(onChanged).toHaveBeenCalled();
  });

  it("shows the server's refusal", async () => {
    mockActivate.mockResolvedValue({
      ok: false,
      error: { code: "already_signed", message: "The franchise changed while activating it. Reload and try again." },
      issues: [],
    });
    render(<FranchiseActivationCard franchise={franchise()} onChanged={vi.fn()} />);

    await userEvent.click(screen.getByTestId("button-activate-franchise"));
    await userEvent.click(screen.getByTestId("button-confirm-activate-franchise"));
    expect(await screen.findByTestId("franchise-activation-error")).toHaveTextContent("Reload and try again.");
  });

  it("offers nothing to a declined franchise", () => {
    render(<FranchiseActivationCard franchise={franchise({ status: "declined" })} onChanged={vi.fn()} />);
    expect(screen.getByTestId("franchise-activation-declined")).toHaveTextContent("Invite them again");
    expect(screen.queryByTestId("button-activate-franchise")).not.toBeInTheDocument();
  });

  it("shows when an active franchise went live", () => {
    render(
      <FranchiseActivationCard franchise={franchise({ status: "active" }, { activatedAt: "2026-10-01T05:00:00.000Z" })} onChanged={vi.fn()} />,
    );
    expect(screen.getByTestId("card-franchise-activation")).toHaveTextContent("Activated");
    expect(screen.queryByTestId("button-activate-franchise")).not.toBeInTheDocument();
  });
});
