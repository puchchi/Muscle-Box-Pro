import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { mockActivate } = vi.hoisted(() => ({ mockActivate: vi.fn() }));
vi.mock("@/lib/adminApi", () => ({ activateGym: mockActivate }));

import { GymActivationCard } from "@/pages/admin/GymActivationCard";
import { activationChecks, plainActivationMessage, planActivation } from "@/pages/admin/activationRules";
import { adminGymFixture } from "@/test/adminGymFixture";
import type { AdminGymView } from "@shared/admin/gyms";

const GYM_ID = adminGymFixture().gymId;

function paid(): AdminGymView {
  return { ...adminGymFixture(), depositStatus: "paid" };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("activationRules", () => {
  it("passes a signed, installed gym and flags only the unpaid deposit", () => {
    const checks = activationChecks(adminGymFixture());
    expect(checks.map((c) => [c.key, c.ok])).toEqual([
      ["signed", true],
      ["machine", true],
      ["deposit", false],
    ]);
  });

  it("does not count a placeholder unit as installed", () => {
    const gym = adminGymFixture();
    gym.machine = { ...gym.machine, deviceNo: "PENDING-0001" };
    const machine = activationChecks(gym).find((c) => c.key === "machine")!;
    expect(machine.ok).toBe(false);
    expect(planActivation(paid(), "", true).ready).toBe(true);
    expect(planActivation({ ...gym, depositStatus: "paid" }, "", true)).toEqual({
      ready: false,
      message: "No machine is placed at this gym yet.",
    });
  });

  it("blocks an unsigned gym even with a waiver", () => {
    const gym = adminGymFixture();
    gym.timestamps = { ...gym.timestamps, signedAt: null };
    expect(planActivation(gym, "Collected in cash at the gym.", true)).toMatchObject({ ready: false });
  });

  it("needs a trimmed waiver reason of ten characters when the deposit is unpaid", () => {
    expect(planActivation(adminGymFixture(), "   too short   ", true).ready).toBe(false);
    expect(planActivation(adminGymFixture(), "  Collected in cash at the gym.  ", false)).toEqual({
      ready: true,
      body: { notifyGym: false, depositWaiver: { reason: "Collected in cash at the gym." } },
    });
  });

  it("sends no waiver for a paid deposit", () => {
    expect(planActivation(paid(), "ignored reason text", true)).toEqual({ ready: true, body: { notifyGym: true } });
  });

  it("replaces route names in the server's refusal with where to go on this page", () => {
    const message =
      "This gym has no machine installation date. Set one with PUT /admin/gyms/g1/machine. The deposit is not paid. Activate with an explicit depositWaiver.reason to proceed without it.";
    expect(plainActivationMessage(message)).toBe(
      "This gym has no machine installation date. Add one in the Machine section. The deposit is not paid. Give a reason to waive it.",
    );
  });
});

describe("GymActivationCard", () => {
  it("keeps Activate disabled until the deposit waiver has a reason", async () => {
    render(<GymActivationCard gym={adminGymFixture()} onChanged={vi.fn()} />);

    expect(screen.getByTestId("button-activate-gym")).toBeDisabled();
    await userEvent.type(screen.getByTestId("input-waiver-reason"), "Collected in cash at the gym.");
    expect(screen.getByTestId("button-activate-gym")).toBeEnabled();
  });

  it("asks first, then sends the waiver and the email choice", async () => {
    const onChanged = vi.fn();
    mockActivate.mockResolvedValue({ ok: true, data: { gym: adminGymFixture(), changed: true, emailed: null } });
    render(<GymActivationCard gym={adminGymFixture()} onChanged={onChanged} />);

    await userEvent.type(screen.getByTestId("input-waiver-reason"), "Collected in cash at the gym.");
    await userEvent.click(screen.getByTestId("checkbox-notify-gym"));
    await userEvent.click(screen.getByTestId("button-activate-gym"));
    expect(mockActivate).not.toHaveBeenCalled();
    expect(screen.getByTestId("confirm-activate")).toHaveTextContent("Iron House Gym");

    await userEvent.click(screen.getByTestId("button-confirm-activate"));
    expect(mockActivate).toHaveBeenCalledWith(GYM_ID, {
      notifyGym: false,
      depositWaiver: { reason: "Collected in cash at the gym." },
    });
    expect(onChanged).toHaveBeenCalled();
  });

  it("shows the server's refusal without route names", async () => {
    mockActivate.mockResolvedValue({
      ok: false,
      error: { code: "already_signed", message: "No installation date. Set one with PUT /admin/gyms/g1/machine." },
      issues: [],
    });
    render(<GymActivationCard gym={paid()} onChanged={vi.fn()} />);

    await userEvent.click(screen.getByTestId("button-activate-gym"));
    await userEvent.click(screen.getByTestId("button-confirm-activate"));

    const error = await screen.findByTestId("activation-error");
    expect(error).toHaveTextContent("No installation date. Add one in the Machine section.");
    expect(error).not.toHaveTextContent("PUT");
  });

  it("shows who activated an active gym and offers no button", () => {
    const gym = { ...adminGymFixture(), activatedAt: "2026-07-12T05:00:00.000Z", activatedByEmail: "ops@muscleboxpro.com" };
    render(<GymActivationCard gym={gym} onChanged={vi.fn()} />);

    expect(screen.getByTestId("card-activation")).toHaveTextContent("ops@muscleboxpro.com");
    expect(screen.queryByTestId("button-activate-gym")).not.toBeInTheDocument();
  });
});
