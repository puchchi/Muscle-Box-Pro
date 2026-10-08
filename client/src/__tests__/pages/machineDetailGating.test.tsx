import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const { mockFetchStock } = vi.hoisted(() => ({ mockFetchStock: vi.fn() }));
vi.mock("@/lib/adminMachineApi", () => ({
  fetchStock: mockFetchStock,
  restock: vi.fn(),
  fetchRestockHistory: vi.fn(),
  setMachinePin: vi.fn(),
  setFactoryPin: vi.fn(),
}));

import { settingAccess, validateMachine } from "@/pages/admin/machines/MachineForm";
import { allowedCommandGroups } from "@/pages/admin/machines/remoteRules";
import { MachineStockTab } from "@/pages/admin/machines/MachineStockTab";
import { MachinePinTab } from "@/pages/admin/machines/MachinePinTab";
import { ViewerProvider } from "@/pages/admin/machines/viewer";
import type { Machine } from "@shared/admin/machinesSchema";
import type { MachineViewer, Permission } from "@shared/admin/viewerSchema";

const viewer = (role: MachineViewer["role"], can: Permission[]): MachineViewer => ({
  role,
  name: "Pune Fitness",
  email: "p@x.in",
  franchiseId: null,
  gymId: null,
  can: new Set(can),
});

const has = (list: Permission[]) => (p: Permission) => list.includes(p);

const values = {
  sn: "SN0001",
  modelId: "m1",
  deviceExtNo: "",
  name: "Gold's Baner",
  servicePhone: "",
  address: "",
  latitude: "",
  longitude: "",
  hotMax: "",
  hotMin: "",
  coldMax: "",
  coldMin: "",
  enabled: false,
  qrPay: false,
  freeVend: false,
};

describe("settings a viewer may touch", () => {
  it("marks each group edit, view or hidden", () => {
    const access = settingAccess(has(["settings.name.edit", "settings.hotWater.view"]));
    expect(access.name).toBe("edit");
    expect(access.hotWater).toBe("view");
    expect(access.qrPay).toBe("hidden");
  });

  it("sends only the editable fields and ignores errors in the rest", () => {
    const access = settingAccess(has(["settings.name.edit", "settings.enabled.edit", "settings.hotWater.view"]));
    const { errors, input } = validateMachine(values, false, access);
    expect(errors).toEqual({});
    expect(input).toEqual({ name: "Gold's Baner", enabled: false });
  });

  it("still checks a field the viewer can change", () => {
    const access = settingAccess(has(["settings.name.edit"]));
    expect(validateMachine({ ...values, name: "" }, false, access).errors.name).toBe("Required.");
  });
});

describe("remote commands a viewer may send", () => {
  it("keeps only the commands with a permission, and drops empty groups", () => {
    const groups = allowedCommandGroups(has(["remote.clean.edit", "remote.lock.edit"]));
    expect(groups.map((g) => [g.title, g.commands.map((c) => c.name)])).toEqual([
      ["Cleaning", ["clean", "resetTrack"]],
      ["Door and lock", ["lock"]],
    ]);
    expect(allowedCommandGroups(() => false)).toEqual([]);
  });
});

const slot = {
  slotId: "s1",
  materialId: "m1",
  name: "Whey",
  position: "1",
  rawType: "powder",
  unit: "g",
  capacity: 1000,
  warnCapacity: 100,
  residueQty: 400,
  low: false,
};

describe("stock for a viewer who can only look", () => {
  it("shows levels without the restock controls", async () => {
    mockFetchStock.mockResolvedValue({ ok: true, data: { items: [slot] } });
    render(
      <ViewerProvider value={viewer("gym", ["stock.view"])}>
        <MachineStockTab sn="SN01" />
      </ViewerProvider>,
    );
    await screen.findByTestId("row-slot-s1");
    expect(screen.getByTestId("current-s1")).toBeInTheDocument();
    expect(screen.queryByTestId("add-s1")).not.toBeInTheDocument();
    expect(screen.queryByTestId("button-fill-100")).not.toBeInTheDocument();
    expect(screen.queryByTestId("button-submit-stock")).not.toBeInTheDocument();
    expect(screen.queryByTestId("link-restock-history")).not.toBeInTheDocument();
  });
});

describe("PINs by permission", () => {
  it("shows a franchise the operator PIN form and nothing of the factory PIN", () => {
    const machine = { sn: "SN01", hasPin: true, pinChangedAt: null, pinChangedBy: null } as unknown as Machine;
    render(
      <ViewerProvider value={viewer("franchise", ["pins.operator.view", "pins.operator.edit"])}>
        <MachinePinTab machine={machine} onChanged={() => {}} />
      </ViewerProvider>,
    );
    expect(screen.getByTestId("pin-form")).toBeInTheDocument();
    expect(screen.queryByTestId("factory-pin-form")).not.toBeInTheDocument();
    expect(screen.queryByText(/factory/i)).not.toBeInTheDocument();
  });

  it("shows a viewer without edit whether the PIN is set, but no form", () => {
    const machine = { sn: "SN01", hasPin: true, pinChangedAt: null, pinChangedBy: null } as unknown as Machine;
    render(
      <ViewerProvider value={viewer("operator", ["pins.operator.view"])}>
        <MachinePinTab machine={machine} onChanged={() => {}} />
      </ViewerProvider>,
    );
    expect(screen.queryByTestId("pin-form")).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });
});
