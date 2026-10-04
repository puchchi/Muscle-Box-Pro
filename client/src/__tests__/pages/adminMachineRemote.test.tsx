import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const api = vi.hoisted(() => ({
  machineIotConfigured: () => true,
  enrolMqtt: vi.fn(),
  revokeMqtt: vi.fn(),
  sendCommand: vi.fn(),
  fetchCommand: vi.fn(),
  cancelCommand: vi.fn(),
  openSession: vi.fn(),
  endSession: vi.fn(),
  fetchLive: vi.fn(),
}));
vi.mock("@/lib/machineIotApi", () => api);

import { MachineRemoteTab } from "@/pages/admin/machines/MachineRemoteTab";
import { commandLabel, commandOutcome, formatCountdown, formatEnrolCode } from "@/pages/admin/machines/remoteRules";
import type { Machine } from "@shared/admin/machinesSchema";
import type { MachineMqtt, RemoteCommand } from "@shared/admin/remoteSchema";

const ok = <T,>(data: T) => ({ ok: true, data });
const fail = (code: string, message: string, fieldErrors?: Record<string, string>) => ({ ok: false, error: { code, message, fieldErrors }, issues: [] });

const connected: MachineMqtt = {
  state: "connected",
  online: true,
  certificate: { fingerprint: "ab12cd", issuedAt: "2026-10-04T10:00:00.000+05:30", sourceIp: "1.2.3.4", codeCreatedBy: "ops@mbp.in" },
  pendingCode: null,
};

const machineWith = (mqtt: MachineMqtt | null) => ({ sn: "GS805TEST01", mqtt }) as Machine;

const command = (over: Partial<RemoteCommand> = {}): RemoteCommand => ({
  id: "0123456789abcdef",
  sn: "GS805TEST01",
  name: "clean",
  args: { times: 1, grounds: false },
  by: "Anurag",
  state: "sent",
  reason: null,
  detail: null,
  createdAt: "2026-10-04T15:20:01.123+05:30",
  expiresAt: null,
  claimedAt: null,
  finishedAt: null,
  ...over,
});

const noLive = { sn: "GS805TEST01", mqttOnline: true, session: null, status: null, statusAt: null, statusAgeSeconds: null };

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.clearAllMocks();
  api.fetchLive.mockResolvedValue(ok(noLive));
  api.endSession.mockResolvedValue(ok({ session: null }));
});

afterEach(() => {
  vi.useRealTimers();
});

const user = () => userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

describe("remote control rules", () => {
  it("formats the code, the countdown and each outcome", () => {
    expect(formatEnrolCode("12345678")).toBe("1234 5678");
    expect(formatCountdown(29 * 60_000 + 41_000)).toBe("29:41");
    expect(formatCountdown(-5)).toBe("0:00");
    expect(commandLabel(command({ args: { times: 2, grounds: true } }))).toBe("Clean pipes ×2, and the grounds");
    expect(commandOutcome(command({ state: "refused", reason: "inUse" }))).toBe("The machine said not now: a customer is using the screen. Nothing ran.");
    expect(commandOutcome(command({ state: "refused", reason: "door jammed" }))).toContain("door jammed");
    expect(commandOutcome(command({ state: "failed", reason: "publish" }))).toBe("The machine couldn't be reached. Nothing ran.");
    expect(commandOutcome(command({ state: "failed", reason: "board", detail: "E07 grinder stuck" }))).toBe("The machine tried, and it failed: E07 grinder stuck");
  });
});

describe("MQTT card", () => {
  it("hides commands until connected", () => {
    render(<MachineRemoteTab machine={machineWith({ ...connected, state: "no_certificate", certificate: null, online: false })} onReload={vi.fn()} />);
    expect(screen.getByTestId("mqtt-state")).toHaveTextContent("Not set up");
    expect(screen.getByTestId("remote-needs-mqtt")).toBeInTheDocument();
    expect(screen.queryByTestId("card-remote-commands")).not.toBeInTheDocument();
    expect(screen.queryByTestId("button-mqtt-revoke")).not.toBeInTheDocument();
  });

  it("warns about a certificate we didn't issue", () => {
    render(<MachineRemoteTab machine={machineWith({ ...connected, state: "not_issued_to_this_tablet", certificate: null })} onReload={vi.fn()} />);
    expect(screen.getByTestId("mqtt-unknown-cert")).toHaveTextContent("not with a certificate we issued");
    expect(screen.getByTestId("button-mqtt-revoke")).toBeInTheDocument();
  });

  it("shows a new code once with a countdown, and after a reload only the countdown", async () => {
    const pending = { createdBy: "ops@mbp.in", expiresAt: new Date(Date.now() + 1_800_000).toISOString() };
    const onReload = vi.fn().mockResolvedValue(null);
    api.enrolMqtt.mockResolvedValue(ok({ sn: "GS805TEST01", code: "12345678", expiresAt: pending.expiresAt, validForSeconds: 1800 }));
    const base = { ...connected, state: "no_certificate" as const, certificate: null, online: false };
    const { rerender, unmount } = render(<MachineRemoteTab machine={machineWith(base)} onReload={onReload} />);

    await user().click(screen.getByTestId("button-mqtt-connect"));
    rerender(<MachineRemoteTab machine={machineWith({ ...base, pendingCode: pending })} onReload={onReload} />);
    expect(await screen.findByTestId("mqtt-code-value")).toHaveTextContent("1234 5678");
    expect(screen.getByTestId("mqtt-code-countdown")).toHaveTextContent("Expires in 30:00");
    await act(() => vi.advanceTimersByTimeAsync(10_000));
    expect(screen.getByTestId("mqtt-code-countdown")).toHaveTextContent("Expires in 29:5");
    expect(onReload).toHaveBeenCalledTimes(2);

    unmount();
    render(<MachineRemoteTab machine={machineWith({ ...base, pendingCode: pending })} onReload={onReload} />);
    expect(screen.queryByTestId("mqtt-code-value")).not.toBeInTheDocument();
    expect(screen.getByTestId("mqtt-code-open")).toHaveTextContent("A code made by ops@mbp.in is open for 29:");
  });

  it("asks before disconnecting", async () => {
    api.revokeMqtt.mockResolvedValue(ok({ sn: "GS805TEST01", retired: 1 }));
    render(<MachineRemoteTab machine={machineWith(connected)} onReload={vi.fn().mockResolvedValue(null)} />);
    await user().click(screen.getByTestId("button-mqtt-revoke"));
    expect(api.revokeMqtt).not.toHaveBeenCalled();
    await user().click(await screen.findByTestId("dialog-mqtt-revoke-confirm"));
    expect(await screen.findByTestId("mqtt-done")).toHaveTextContent("Disconnected. 1 certificate was turned off.");
  });
});

describe("Commands", () => {
  it("sends a clean with its args, and reads it every 2 s until it is final", async () => {
    api.sendCommand.mockResolvedValue(ok({ command: command({ args: { times: 2, grounds: true } }) }));
    api.fetchCommand
      .mockResolvedValueOnce(ok({ command: command({ state: "running", args: { times: 2, grounds: true } }) }))
      .mockResolvedValueOnce(ok({ command: command({ state: "done", args: { times: 2, grounds: true } }) }));
    render(<MachineRemoteTab machine={machineWith(connected)} onReload={vi.fn()} />);
    const u = user();
    await u.selectOptions(screen.getByTestId("input-clean-times"), "2");
    await u.click(screen.getByTestId("input-clean-grounds"));
    await u.click(screen.getByTestId("button-command-clean"));

    expect(api.sendCommand).toHaveBeenCalledWith("GS805TEST01", "clean", { times: 2, grounds: true });
    expect(screen.getByTestId("remote-command-state")).toHaveTextContent("Waiting");
    expect(screen.getByTestId("button-command-reboot")).toBeDisabled();

    await act(() => vi.advanceTimersByTimeAsync(2_000));
    expect(screen.getByTestId("remote-command-state")).toHaveTextContent("Running");
    expect(screen.queryByTestId("button-command-cancel")).not.toBeInTheDocument();
    await act(() => vi.advanceTimersByTimeAsync(2_000));
    expect(screen.getByTestId("remote-command-state")).toHaveTextContent("Done");
    await act(() => vi.advanceTimersByTimeAsync(6_000));
    expect(api.fetchCommand).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId("button-command-reboot")).toBeEnabled();
  });

  it("confirms unlock, restart and reboot before sending", async () => {
    api.sendCommand.mockResolvedValue(ok({ command: command({ name: "reboot", args: {}, state: "failed", reason: "publish" }) }));
    render(<MachineRemoteTab machine={machineWith(connected)} onReload={vi.fn()} />);
    await user().click(screen.getByTestId("button-command-reboot"));
    expect(api.sendCommand).not.toHaveBeenCalled();
    await user().click(await screen.findByTestId("dialog-command-confirm"));
    expect(api.sendCommand).toHaveBeenCalledWith("GS805TEST01", "reboot", undefined);
    expect(await screen.findByTestId("remote-command-outcome")).toHaveTextContent("The machine couldn't be reached. Nothing ran.");
  });

  it("shows the running command on a 409 in_use, and cancels it while it is still sent", async () => {
    api.sendCommand.mockResolvedValue(fail("in_use", "This machine is still running another command.", { commandId: "fedcba9876543210" }));
    api.fetchCommand.mockResolvedValue(ok({ command: command({ id: "fedcba9876543210", name: "addWater", args: {} }) }));
    api.cancelCommand.mockResolvedValue(ok({ command: command({ id: "fedcba9876543210", name: "addWater", args: {}, state: "cancelled" }) }));
    render(<MachineRemoteTab machine={machineWith(connected)} onReload={vi.fn()} />);
    await user().click(screen.getByTestId("button-command-empty"));

    expect(api.fetchCommand).toHaveBeenCalledWith("GS805TEST01", "fedcba9876543210");
    const panel = await screen.findByTestId("remote-command");
    expect(panel).toHaveTextContent("Add water");
    expect(within(panel).getByTestId("remote-command-busy")).toBeInTheDocument();
    expect(screen.queryByTestId("remote-command-error")).not.toBeInTheDocument();

    await user().click(screen.getByTestId("button-command-cancel"));
    expect(api.cancelCommand).toHaveBeenCalledWith("GS805TEST01", "fedcba9876543210");
    expect(screen.getByTestId("remote-command-state")).toHaveTextContent("Cancelled");
  });
});

describe("Live status", () => {
  const status = {
    step: "menu",
    making: false,
    boardOnline: true,
    faults: [{ code: "E01", text: "Machine no water" }],
    hotTemp: 92,
    coldTemp: 6,
    door: "closed" as const,
    cupPresent: null,
    lastDrinkAt: 1759570000000,
    appVersion: "1.0.0 (abc12345)",
    mqtt: true,
    network: "wifi",
  };
  const session = { id: "s1", by: "Anurag", until: "2026-10-04T15:30:00+05:30", secondsLeft: 600 };

  it("opens a session, counts down, reads every 5 s, greys out an old report and ends the session on close", async () => {
    api.openSession.mockResolvedValue(ok({ session }));
    api.fetchLive
      .mockResolvedValueOnce(ok(noLive))
      .mockResolvedValueOnce(ok({ ...noLive, session, status, statusAgeSeconds: 2 }))
      .mockResolvedValue(ok({ ...noLive, session: { ...session, secondsLeft: 590 }, status, statusAgeSeconds: 40 }));
    const { unmount } = render(<MachineRemoteTab machine={machineWith(connected)} onReload={vi.fn()} />);
    await user().click(await screen.findByTestId("button-live-open"));

    expect(api.openSession).toHaveBeenCalledWith("GS805TEST01", 600);
    expect(await screen.findByTestId("live-faults")).toHaveTextContent("E01 Machine no water");
    expect(screen.getByTestId("live-status")).toHaveAttribute("data-stale", "false");
    expect(screen.getByTestId("live-countdown")).toHaveTextContent("Live 10:00");

    await act(() => vi.advanceTimersByTimeAsync(5_000));
    expect(screen.getByTestId("live-status")).toHaveAttribute("data-stale", "true");
    expect(screen.getByTestId("live-age")).toHaveTextContent("Last report 40 s ago");
    expect(screen.getByTestId("live-countdown")).toHaveTextContent("Live 9:50");

    await user().click(screen.getByTestId("button-live-extend"));
    expect(api.openSession).toHaveBeenLastCalledWith("GS805TEST01", 600);

    unmount();
    expect(api.endSession).toHaveBeenCalledWith("GS805TEST01");
  });

  it("says the machine is unreachable on a 409, and opens nothing", async () => {
    api.openSession.mockResolvedValue(fail("conflict", "The machine could not be reached over MQTT. Try again."));
    const { unmount } = render(<MachineRemoteTab machine={machineWith(connected)} onReload={vi.fn()} />);
    await user().click(await screen.findByTestId("button-live-open"));
    expect(await screen.findByTestId("live-error")).toHaveTextContent("couldn't be reached over MQTT. Nothing was opened.");
    expect(screen.queryByTestId("live-countdown")).not.toBeInTheDocument();
    unmount();
    expect(api.endSession).not.toHaveBeenCalled();
  });

  it("does not end a session someone else opened when the panel closes", async () => {
    api.fetchLive.mockResolvedValue(ok({ ...noLive, session: { ...session, by: "Priya" }, status, statusAgeSeconds: 3 }));
    const { unmount } = render(<MachineRemoteTab machine={machineWith(connected)} onReload={vi.fn()} />);
    expect(await screen.findByText("Opened by Priya")).toBeInTheDocument();
    unmount();
    expect(api.endSession).not.toHaveBeenCalled();
  });
});
