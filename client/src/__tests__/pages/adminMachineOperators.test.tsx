import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { MachineViewer, Permission } from "@shared/admin/viewerSchema";

const { api, mockMachines, mockChoices, viewerRef } = vi.hoisted(() => ({
  api: { fetchOperators: vi.fn(), createOperator: vi.fn(), updateOperator: vi.fn(), setOperatorDisabled: vi.fn(), resendOperatorInvite: vi.fn() },
  mockMachines: vi.fn(),
  mockChoices: vi.fn(),
  viewerRef: { current: null as MachineViewer | null },
}));
vi.mock("@/lib/operatorsApi", () => api);
vi.mock("@/lib/adminMachineApi", () => ({ fetchAllMachines: mockMachines }));
vi.mock("@/pages/admin/machines/ownerBits", () => ({ useOwnerChoices: mockChoices }));
vi.mock("@/pages/admin/machines/viewer", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/pages/admin/machines/viewer")>()),
  useMachineGuard: () => ({ state: "ready", session: viewerRef.current }),
}));
vi.mock("@/pages/admin/machines/MachinesShell", () => ({
  MachinesShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import AdminMachineOperators, { checkOperator, operatorPatch } from "@/pages/admin/AdminMachineOperators";
import type { Operator } from "@shared/admin/operatorsSchema";

const viewer = (role: MachineViewer["role"], can: Permission[]): MachineViewer => ({
  role,
  name: "Pune Fitness",
  email: "p@x.in",
  franchiseId: role === "franchise" ? "f1" : null,
  gymId: null,
  can: new Set(can),
});

const machine = (sn: string, deviceExtNo: string, franchiseId: string | null) => ({
  sn,
  deviceExtNo,
  name: `Gym ${deviceExtNo}`,
  modelId: "m",
  modelName: "M",
  enabled: true,
  online: true,
  lastSeenAt: null,
  runStatus: null,
  faultStatus: "normal",
  faultRemark: "",
  statusAt: null,
  stockStatus: "normal",
  stockRemark: "",
  restartPending: false,
  freeVend: false,
  hasFactoryPin: false,
  owner: franchiseId ? { franchiseId } : null,
});

const ravi: Operator = {
  email: "ravi@x.in",
  name: "Ravi",
  phone: null,
  status: "active",
  franchiseId: "f1",
  franchiseName: "Pune Fitness",
  machines: ["SN1"],
  createdBy: { kind: "franchise", email: "p@x.in" },
  createdAt: "2026-10-01T10:00:00Z",
  updatedAt: null,
  lastLoginAt: null,
  disabledAt: null,
  disabledReason: null,
};

beforeEach(() => {
  Object.values(api).forEach((f) => f.mockReset());
  mockMachines.mockResolvedValue({ ok: true, data: [machine("SN1", "101", "f1"), machine("SN2", "102", "f2")] });
  mockChoices.mockReturnValue({ franchises: [{ franchiseId: "f1", name: "Pune Fitness" }], gyms: [] });
});

describe("Operators page", () => {
  it("lists a franchise's operators without a franchise column or the owner lookup", async () => {
    viewerRef.current = viewer("franchise", ["operators.view", "operators.edit"]);
    api.fetchOperators.mockResolvedValue({ ok: true, data: [ravi] });
    render(<AdminMachineOperators />);
    const row = await screen.findByTestId("row-operator-ravi@x.in");
    expect(api.fetchOperators).toHaveBeenCalledWith("franchise");
    expect(row).toHaveTextContent("Ravi");
    expect(row).toHaveTextContent("Never");
    expect(within(row).getByTestId("operator-status-ravi@x.in")).toHaveTextContent("Active");
    expect(await within(row).findAllByText("101")).toHaveLength(2);
    expect(screen.queryByText("Franchise")).not.toBeInTheDocument();
    expect(mockChoices).not.toHaveBeenCalled();
  });

  it("hides every change for a viewer who may only look", async () => {
    viewerRef.current = viewer("franchise", ["operators.view"]);
    api.fetchOperators.mockResolvedValue({ ok: true, data: [ravi] });
    render(<AdminMachineOperators />);
    await screen.findByTestId("row-operator-ravi@x.in");
    expect(screen.queryByTestId("button-add-operator")).not.toBeInTheDocument();
    expect(screen.queryByTestId("edit-operator-ravi@x.in")).not.toBeInTheDocument();
  });

  it("shows the link to copy when the invite email did not go out", async () => {
    viewerRef.current = viewer("admin", ["operators.view", "operators.edit"]);
    api.fetchOperators.mockResolvedValue({ ok: true, data: [] });
    const asha: Operator = { ...ravi, email: "asha@x.in", name: "Asha", status: "invited", machines: ["SN1"] };
    api.createOperator.mockResolvedValue({
      ok: true,
      data: { operator: asha, inviteUrl: "https://mbp.in/operator/set-password/h1", inviteExpiresAt: null, emailed: false },
    });
    const user = userEvent.setup();
    render(<AdminMachineOperators />);
    await user.click(await screen.findByTestId("button-add-operator"));
    await user.type(screen.getByTestId("input-operator-name"), "Asha");
    await user.type(screen.getByTestId("input-operator-email"), "asha@x.in");
    await user.selectOptions(screen.getByRole("combobox"), "f1");
    const picker = screen.getByTestId("operator-machines");
    expect(within(picker).queryByText("102")).not.toBeInTheDocument();
    await user.click(within(picker).getByRole("checkbox"));
    await user.click(screen.getByTestId("button-save-operator"));
    expect(api.createOperator).toHaveBeenCalledWith("admin", { email: "asha@x.in", name: "Asha", phone: null, machines: ["SN1"], franchiseId: "f1" });
    const panel = await screen.findByTestId("operator-invite-link");
    expect(within(panel).getByRole("textbox")).toHaveValue("https://mbp.in/operator/set-password/h1");
    expect(screen.getByTestId("operator-status-asha@x.in")).toHaveTextContent("Invite sent");
  });

  it("keeps the franchise name after an edit, which the server only sends in the list", async () => {
    viewerRef.current = viewer("admin", ["operators.view", "operators.edit"]);
    api.fetchOperators.mockResolvedValue({ ok: true, data: [ravi] });
    api.setOperatorDisabled.mockResolvedValue({ ok: true, data: { ...ravi, status: "disabled", franchiseName: null } });
    const user = userEvent.setup();
    render(<AdminMachineOperators />);
    await user.click(await screen.findByTestId("disable-operator-ravi@x.in"));
    await user.click(screen.getByTestId("button-confirm-disable"));
    const row = await screen.findByTestId("row-operator-ravi@x.in");
    await within(row).findByText("Turned off");
    expect(row).toHaveTextContent("Pune Fitness");
  });

  it("turns an operator off with a reason", async () => {
    viewerRef.current = viewer("franchise", ["operators.view", "operators.edit"]);
    api.fetchOperators.mockResolvedValue({ ok: true, data: [ravi] });
    api.setOperatorDisabled.mockResolvedValue({ ok: true, data: { ...ravi, status: "disabled", disabledReason: "Left" } });
    const user = userEvent.setup();
    render(<AdminMachineOperators />);
    await user.click(await screen.findByTestId("disable-operator-ravi@x.in"));
    await user.type(screen.getByTestId("input-operator-reason"), "Left");
    await user.click(screen.getByTestId("button-confirm-disable"));
    expect(api.setOperatorDisabled).toHaveBeenCalledWith("franchise", "ravi@x.in", true, "Left");
    expect(await screen.findByTestId("operator-status-ravi@x.in")).toHaveTextContent("Turned off");
    expect(screen.getByTestId("enable-operator-ravi@x.in")).toBeInTheDocument();
  });
});

describe("operator form rules", () => {
  const values = { name: "Ravi", email: "ravi@x.in", phone: "", franchiseId: "", machines: ["SN1"] };

  it("needs a name and, when adding, a real email", () => {
    expect(checkOperator({ ...values, name: " ", email: "nope" }, true)).toEqual({
      name: "Enter the operator's name.",
      email: "Enter a valid email address.",
    });
    expect(checkOperator({ ...values, email: "" }, false)).toEqual({});
  });

  it("takes the same phone numbers the server does", () => {
    const phone = (p: string) => checkOperator({ ...values, phone: p }, false).phone;
    expect(phone("+91 (982) 000-0000")).toBeUndefined();
    expect(phone("98200 00")).toBeUndefined();
    expect(phone("982000")).toBeDefined();
    expect(phone("98+2000000")).toBeDefined();
  });

  it("sends only what changed", () => {
    expect(operatorPatch(ravi, values)).toEqual({});
    expect(operatorPatch(ravi, { ...values, phone: "98200 00000", machines: ["SN1", "SN2"] })).toEqual({
      phone: "98200 00000",
      machines: ["SN1", "SN2"],
    });
  });
});
