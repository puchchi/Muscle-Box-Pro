import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { MachineViewer, Permission } from "@shared/admin/viewerSchema";

const { api, mockMachines, mockChoices, viewerRef } = vi.hoisted(() => ({
  api: {
    fetchOperators: vi.fn(),
    fetchSuggestedOperatorId: vi.fn(),
    createOperator: vi.fn(),
    updateOperator: vi.fn(),
    setOperatorPassword: vi.fn(),
    setOperatorDisabled: vi.fn(),
  },
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

import AdminMachineOperators, { checkOperator, makePassword, operatorPatch } from "@/pages/admin/AdminMachineOperators";
import type { Operator } from "@shared/admin/operatorsSchema";

const viewer = (role: MachineViewer["role"], can: Permission[]): MachineViewer => ({
  role,
  name: "Pune Fitness",
  email: "p@x.in",
  operatorId: null,
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
  operatorId: "op_pune_01",
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
  passwordSetAt: "2026-10-01T10:00:00Z",
  lastLoginAt: null,
  disabledAt: null,
  disabledReason: null,
};

beforeEach(() => {
  Object.values(api).forEach((f) => f.mockReset());
  mockMachines.mockResolvedValue({ ok: true, data: [machine("SN1", "101", "f1"), machine("SN2", "102", "f2")] });
  api.fetchSuggestedOperatorId.mockImplementation((_as: string, franchiseId: string | null) =>
    Promise.resolve(franchiseId === "f1" ? "op_pune_02" : "op_mbp_01"),
  );
  mockChoices.mockReturnValue({ franchises: [{ franchiseId: "f1", name: "Pune Fitness" }], gyms: [] });
});

const addAs = async (role: MachineViewer["role"], operators: Operator[] = []) => {
  viewerRef.current = viewer(role, ["operators.view", "operators.edit"]);
  api.fetchOperators.mockResolvedValue({ ok: true, data: operators });
  const user = userEvent.setup();
  render(<AdminMachineOperators />);
  await user.click(await screen.findByTestId("button-add-operator"));
  return user;
};

describe("Operators page", () => {
  it("lists a franchise's operators by operator ID without a franchise column or the owner lookup", async () => {
    viewerRef.current = viewer("franchise", ["operators.view", "operators.edit"]);
    api.fetchOperators.mockResolvedValue({ ok: true, data: [ravi] });
    render(<AdminMachineOperators />);
    const row = await screen.findByTestId("row-operator-op_pune_01");
    expect(api.fetchOperators).toHaveBeenCalledWith("franchise");
    expect(row).toHaveTextContent("Ravi");
    expect(row).toHaveTextContent("op_pune_01");
    expect(row).toHaveTextContent("ravi@x.in");
    expect(row).toHaveTextContent("Never");
    expect(within(row).getByTestId("operator-status-op_pune_01")).toHaveTextContent("Active");
    expect(await within(row).findAllByText("101")).toHaveLength(2);
    expect(screen.queryByText("Franchise")).not.toBeInTheDocument();
    expect(mockChoices).not.toHaveBeenCalled();
  });

  it("lists an operator who has no email or mobile", async () => {
    viewerRef.current = viewer("franchise", ["operators.view"]);
    api.fetchOperators.mockResolvedValue({ ok: true, data: [{ ...ravi, email: null }] });
    render(<AdminMachineOperators />);
    expect(await screen.findByTestId("row-operator-op_pune_01")).toHaveTextContent("op_pune_01");
  });

  it("hides every change for a viewer who may only look", async () => {
    viewerRef.current = viewer("franchise", ["operators.view"]);
    api.fetchOperators.mockResolvedValue({ ok: true, data: [ravi] });
    render(<AdminMachineOperators />);
    await screen.findByTestId("row-operator-op_pune_01");
    expect(screen.queryByTestId("button-add-operator")).not.toBeInTheDocument();
    expect(screen.queryByTestId("edit-operator-op_pune_01")).not.toBeInTheDocument();
    expect(screen.queryByTestId("password-operator-op_pune_01")).not.toBeInTheDocument();
  });

  it("adds an operator with a suggested ID, a made password and no email, then shows what to hand over", async () => {
    const asha: Operator = { ...ravi, operatorId: "op_pune_02", email: null, name: "Asha" };
    api.createOperator.mockResolvedValue({ ok: true, data: asha });
    const user = await addAs("admin");
    expect(await screen.findByTestId("input-operator-id")).toHaveValue("op_mbp_01");
    await user.type(screen.getByTestId("input-operator-name"), "Asha");
    await user.selectOptions(screen.getByRole("combobox"), "f1");
    expect(await screen.findByDisplayValue("op_pune_02")).toBeInTheDocument();
    expect(api.fetchSuggestedOperatorId).toHaveBeenLastCalledWith("admin", "f1");
    await user.click(screen.getByTestId("button-make-password"));
    const password = (screen.getByTestId("input-operator-password") as HTMLInputElement).value;
    expect(password).toMatch(/^[a-z2-9]{4}-[a-z2-9]{4}-[a-z2-9]{4}$/);
    const picker = screen.getByTestId("operator-machines");
    expect(within(picker).queryByText("102")).not.toBeInTheDocument();
    await user.click(within(picker).getByRole("checkbox"));
    await user.click(screen.getByTestId("button-save-operator"));
    expect(api.createOperator).toHaveBeenCalledWith("admin", {
      operatorId: "op_pune_02",
      password,
      name: "Asha",
      machines: ["SN1"],
      franchiseId: "f1",
    });
    const panel = await screen.findByTestId("operator-credentials");
    expect(within(panel).getByTestId("credentials-id")).toHaveTextContent("op_pune_02");
    expect(within(panel).getByTestId("credentials-password")).toHaveTextContent(password);
    expect(screen.getByTestId("row-operator-op_pune_02")).toBeInTheDocument();
    await user.click(within(panel).getByTestId("button-credentials-done"));
    expect(screen.queryByTestId("operator-credentials")).not.toBeInTheDocument();
  });

  it("keeps an ID the person typed when the franchise changes", async () => {
    const user = await addAs("admin");
    const id = await screen.findByTestId("input-operator-id");
    await screen.findByDisplayValue("op_mbp_01");
    await user.clear(id);
    await user.type(id, "Ravi_Night");
    await user.selectOptions(screen.getByRole("combobox"), "f1");
    expect(id).toHaveValue("ravi_night");
  });

  it("refuses an ID already in the list without asking the server", async () => {
    const user = await addAs("franchise", [ravi]);
    const id = await screen.findByTestId("input-operator-id");
    await user.clear(id);
    await user.type(id, "op_pune_01");
    await user.type(screen.getByTestId("input-operator-name"), "Asha");
    await user.type(screen.getByTestId("input-operator-password"), "good-phrase");
    await user.click(screen.getByTestId("button-save-operator"));
    expect(screen.getByText("That ID is already taken.")).toBeInTheDocument();
    expect(api.createOperator).not.toHaveBeenCalled();
  });

  it("shows the server's taken-ID answer under the ID", async () => {
    api.createOperator.mockResolvedValue({
      ok: false,
      error: { code: "validation", message: "Some details need fixing.", fieldErrors: { operatorId: "That ID is already taken." } },
      issues: [],
    });
    const user = await addAs("franchise");
    await screen.findByDisplayValue("op_mbp_01");
    await user.type(screen.getByTestId("input-operator-name"), "Asha");
    await user.type(screen.getByTestId("input-operator-password"), "good-phrase");
    await user.type(screen.getByTestId("input-operator-email"), "asha@x.in");
    await user.click(screen.getByTestId("button-save-operator"));
    expect(api.createOperator).toHaveBeenCalledWith("franchise", expect.objectContaining({ operatorId: "op_mbp_01", email: "asha@x.in" }));
    expect(await screen.findByText("That ID is already taken.")).toBeInTheDocument();
    expect(screen.getByTestId("operator-dialog")).toBeInTheDocument();
  });

  it("changes a password and shows the new one once", async () => {
    viewerRef.current = viewer("franchise", ["operators.view", "operators.edit"]);
    api.fetchOperators.mockResolvedValue({ ok: true, data: [ravi] });
    api.setOperatorPassword.mockResolvedValue({ ok: true, data: ravi });
    const user = userEvent.setup();
    render(<AdminMachineOperators />);
    await user.click(await screen.findByTestId("password-operator-op_pune_01"));
    await user.type(screen.getByTestId("input-operator-new-password"), "short");
    await user.click(screen.getByTestId("button-save-password"));
    expect(screen.getByText("Use at least 8 characters.")).toBeInTheDocument();
    await user.type(screen.getByTestId("input-operator-new-password"), "-and-longer");
    await user.click(screen.getByTestId("button-save-password"));
    expect(api.setOperatorPassword).toHaveBeenCalledWith("franchise", "op_pune_01", "short-and-longer");
    expect(await screen.findByTestId("credentials-password")).toHaveTextContent("short-and-longer");
    expect(screen.getByTestId("operator-credentials")).toHaveTextContent("signed out everywhere");
  });

  it("edits the email and mobile, and can clear them", async () => {
    viewerRef.current = viewer("franchise", ["operators.view", "operators.edit"]);
    api.fetchOperators.mockResolvedValue({ ok: true, data: [ravi] });
    api.updateOperator.mockResolvedValue({ ok: true, data: { ...ravi, email: null, phone: "98200 00000" } });
    const user = userEvent.setup();
    render(<AdminMachineOperators />);
    await user.click(await screen.findByTestId("edit-operator-op_pune_01"));
    expect(screen.queryByTestId("input-operator-id")).not.toBeInTheDocument();
    await user.clear(screen.getByTestId("input-operator-email"));
    await user.type(screen.getByTestId("input-operator-phone"), "98200 00000");
    await user.click(screen.getByTestId("button-save-operator"));
    expect(api.updateOperator).toHaveBeenCalledWith("franchise", "op_pune_01", { email: null, phone: "98200 00000" });
    expect(await screen.findByTestId("operators-notice")).toHaveTextContent("Ravi is saved.");
  });

  it("keeps the franchise name after an edit, which the server only sends in the list", async () => {
    viewerRef.current = viewer("admin", ["operators.view", "operators.edit"]);
    api.fetchOperators.mockResolvedValue({ ok: true, data: [ravi] });
    api.setOperatorDisabled.mockResolvedValue({ ok: true, data: { ...ravi, status: "disabled", franchiseName: null } });
    const user = userEvent.setup();
    render(<AdminMachineOperators />);
    await user.click(await screen.findByTestId("disable-operator-op_pune_01"));
    await user.click(screen.getByTestId("button-confirm-disable"));
    const row = await screen.findByTestId("row-operator-op_pune_01");
    await within(row).findByText("Turned off");
    expect(row).toHaveTextContent("Pune Fitness");
  });

  it("turns an operator off with a reason", async () => {
    viewerRef.current = viewer("franchise", ["operators.view", "operators.edit"]);
    api.fetchOperators.mockResolvedValue({ ok: true, data: [ravi] });
    api.setOperatorDisabled.mockResolvedValue({ ok: true, data: { ...ravi, status: "disabled", disabledReason: "Left" } });
    const user = userEvent.setup();
    render(<AdminMachineOperators />);
    await user.click(await screen.findByTestId("disable-operator-op_pune_01"));
    await user.type(screen.getByTestId("input-operator-reason"), "Left");
    await user.click(screen.getByTestId("button-confirm-disable"));
    expect(api.setOperatorDisabled).toHaveBeenCalledWith("franchise", "op_pune_01", true, "Left");
    expect(await screen.findByTestId("operator-status-op_pune_01")).toHaveTextContent("Turned off");
    expect(screen.getByTestId("enable-operator-op_pune_01")).toBeInTheDocument();
  });
});

describe("operator form rules", () => {
  const values = { operatorId: "op_mbp_01", password: "good-phrase", name: "Ravi", email: "ravi@x.in", phone: "", franchiseId: "", machines: ["SN1"] };

  it("needs a name, a valid ID and a long enough password when adding", () => {
    expect(checkOperator({ ...values, name: " ", operatorId: "1op", password: "short" }, true)).toEqual({
      name: "Enter the operator's name.",
      operatorId: "Use 3 to 32 lowercase letters, numbers or _. Start with a letter.",
      password: "Use at least 8 characters.",
    });
    expect(checkOperator({ ...values, operatorId: "", password: "" }, false)).toEqual({});
  });

  it("refuses a taken ID", () => {
    expect(checkOperator(values, true, new Set(["op_mbp_01"])).operatorId).toBe("That ID is already taken.");
  });

  it("lets email be empty but not wrong", () => {
    expect(checkOperator({ ...values, email: "" }, true)).toEqual({});
    expect(checkOperator({ ...values, email: "nope" }, false).email).toBe("Enter a valid email address, or leave it empty.");
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
    expect(operatorPatch(ravi, { ...values, email: " ", phone: "98200 00000", machines: ["SN1", "SN2"] })).toEqual({
      email: null,
      phone: "98200 00000",
      machines: ["SN1", "SN2"],
    });
  });

  it("makes passwords without look-alike characters", () => {
    const made = new Set(Array.from({ length: 50 }, makePassword));
    expect(made.size).toBe(50);
    for (const p of made) expect(p).toMatch(/^[a-hj-km-np-z2-9]{4}-[a-hj-km-np-z2-9]{4}-[a-hj-km-np-z2-9]{4}$/);
  });
});
