import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

const { mockViewer, mockAdmin, mockReplace } = vi.hoisted(() => ({
  mockViewer: vi.fn(),
  mockAdmin: vi.fn(),
  mockReplace: vi.fn(),
}));
vi.mock("@/lib/adminMachineApi", () => ({ fetchViewer: mockViewer }));
vi.mock("@/lib/adminSession", () => ({ fetchAdminSession: mockAdmin }));
vi.mock("@/lib/machineConsoleSignIn", () => ({ signOutOfMachineConsole: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: mockReplace }) }));

import { forgetVerifiedViewer, SIGN_IN_PAGE, useMachineGuard } from "@/pages/admin/machines/viewer";
import { PERMISSIONS, viewerSchema } from "@shared/admin/viewerSchema";

beforeEach(() => {
  forgetVerifiedViewer();
  vi.clearAllMocks();
});

describe("useMachineGuard", () => {
  it("uses /me when the server has it", async () => {
    const me = viewerSchema.parse({ role: "gym", name: "Gym", email: "g@x.in", franchiseId: null, gymId: "g1", can: ["machines.list.view"] });
    mockViewer.mockResolvedValue({ ok: true, data: me });
    const { result } = renderHook(() => useMachineGuard());
    await waitFor(() => expect(result.current.state).toBe("ready"));
    expect(result.current.session?.role).toBe("gym");
    expect(mockAdmin).not.toHaveBeenCalled();
  });

  it("falls back to an admin session with every permission when /me is missing", async () => {
    mockViewer.mockResolvedValue({ ok: false, error: { code: "not_found", message: "" } });
    mockAdmin.mockResolvedValue({ email: "a@x.in", role: "admin", displayName: "A", expiresAt: "2030-01-01T00:00:00Z" });
    const { result } = renderHook(() => useMachineGuard());
    await waitFor(() => expect(result.current.state).toBe("ready"));
    expect(result.current.session?.can.size).toBe(PERMISSIONS.length);
  });

  it("sends anyone without a session to the sign-in page", async () => {
    mockViewer.mockResolvedValue({ ok: false, error: { code: "invalid_token", message: "" } });
    mockAdmin.mockResolvedValue(null);
    renderHook(() => useMachineGuard());
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith(SIGN_IN_PAGE));
  });
});

describe("viewerSchema", () => {
  it("drops permission names this build doesn't know", () => {
    const v = viewerSchema.parse({ role: "operator", name: "O", email: "o@x.in", can: ["stock.view", "rockets.launch"] });
    expect([...v.can]).toEqual(["stock.view"]);
    expect(v.franchiseId).toBeNull();
  });
});
