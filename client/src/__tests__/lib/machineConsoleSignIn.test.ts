import { beforeEach, describe, expect, it, vi } from "vitest";

const { api, admin, franchise, gym, operator } = vi.hoisted(() => ({
  api: { IS_PRODUCTION_API: false, forgetBearerSession: () => {} },
  admin: { signInAsAdmin: vi.fn(), signOutAsAdmin: vi.fn() },
  franchise: { signInToFranchisePortal: vi.fn(), signOutOfFranchisePortal: vi.fn(), requestFranchisePasswordReset: vi.fn() },
  gym: { signInToPortal: vi.fn(), signOutOfPortal: vi.fn(), requestPortalPasswordReset: vi.fn() },
  operator: { signInAsOperator: vi.fn(), signOutAsOperator: vi.fn() },
}));
vi.mock("@/lib/apiClient", () => api);
vi.mock("@/lib/adminSession", () => admin);
vi.mock("@/lib/franchiseSession", () => franchise);
vi.mock("@/lib/gymSession", () => gym);
vi.mock("@/lib/operatorSession", () => operator);

import { signInToMachineConsole } from "@/lib/machineConsoleSignIn";

const wrong = { ok: false, error: { code: "invalid_token", message: "Incorrect email or password. Please try again." } };

beforeEach(() => {
  vi.clearAllMocks();
  for (const f of [admin.signInAsAdmin, franchise.signInToFranchisePortal, gym.signInToPortal, operator.signInAsOperator]) f.mockResolvedValue(wrong);
});

describe("one sign-in for the machine console", () => {
  it("stops at the first kind of account that takes the password", async () => {
    gym.signInToPortal.mockResolvedValue({ ok: true, data: {} });
    expect(await signInToMachineConsole("g@x.in", "pw")).toEqual({ ok: true, role: "gym" });
    expect(admin.signInAsAdmin).toHaveBeenCalledWith("g@x.in", "pw");
    expect(franchise.signInToFranchisePortal).toHaveBeenCalled();
    expect(operator.signInAsOperator).not.toHaveBeenCalled();
  });

  it("sends an operator ID only to the operator route", async () => {
    operator.signInAsOperator.mockResolvedValue({ ok: true, data: {} });
    expect(await signInToMachineConsole(" op_mbp_01 ", "pw")).toEqual({ ok: true, role: "operator" });
    expect(operator.signInAsOperator).toHaveBeenCalledWith("op_mbp_01", "pw");
    expect(admin.signInAsAdmin).not.toHaveBeenCalled();
    expect(gym.signInToPortal).not.toHaveBeenCalled();
  });

  it("never sends an email to the operator route", async () => {
    expect(await signInToMachineConsole("r@x.in", "pw")).toMatchObject({ ok: false, error: { code: "wrong" } });
    expect(operator.signInAsOperator).not.toHaveBeenCalled();
  });

  it("says wrong password, throttled or unreachable, in that order of what is known", async () => {
    expect(await signInToMachineConsole("x@x.in", "pw")).toMatchObject({ ok: false, error: { code: "wrong" } });
    franchise.signInToFranchisePortal.mockResolvedValue({ ok: false, error: { code: "network", message: "offline" } });
    expect(await signInToMachineConsole("x@x.in", "pw")).toMatchObject({ ok: false, error: { code: "network" } });
    admin.signInAsAdmin.mockResolvedValue({ ok: false, error: { code: "validation", message: "Too many attempts. Try again shortly." } });
    expect(await signInToMachineConsole("x@x.in", "pw")).toMatchObject({ ok: false, error: { code: "throttled" } });
  });

  it("never tries the operator route where operator accounts are off", async () => {
    vi.resetModules();
    api.IS_PRODUCTION_API = true;
    const { signInToMachineConsole: inProduction } = await import("@/lib/machineConsoleSignIn");
    expect(await inProduction("op_mbp_01", "pw")).toMatchObject({ ok: false, error: { code: "wrong" } });
    expect(operator.signInAsOperator).not.toHaveBeenCalled();
    api.IS_PRODUCTION_API = false;
  });
});
