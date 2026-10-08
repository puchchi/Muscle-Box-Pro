import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { MachineViewer, Permission } from "@shared/admin/viewerSchema";

const { mockFetchGoods, viewerRef } = vi.hoisted(() => ({
  mockFetchGoods: vi.fn(),
  viewerRef: { current: null as MachineViewer | null },
}));
vi.mock("@/lib/adminMachineApi", () => ({
  fetchGoods: mockFetchGoods,
  fetchModels: vi.fn(async () => ({ ok: true, data: { items: [] } })),
  deleteGood: vi.fn(),
  setGoodListing: vi.fn(),
}));
vi.mock("@/lib/machineIotApi", () => ({ machineIotConfigured: () => true }));
vi.mock("@/pages/admin/machines/viewer", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/pages/admin/machines/viewer")>()),
  useMachineGuard: () => ({ state: "ready", session: viewerRef.current }),
}));
vi.mock("@/pages/admin/machines/MachinesShell", () => ({
  MachinesShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock("next/link", () => ({
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import { goodSchema } from "@shared/admin/machinesSchema";
import AdminMachineGoods from "@/pages/admin/AdminMachineGoods";
import { visibleTabs } from "@/pages/admin/AdminMachineDetail";

const viewer = (role: MachineViewer["role"], can: Permission[]): MachineViewer => ({
  role,
  name: "Pune Fitness",
  email: "p@x.in",
  franchiseId: null,
  gymId: null,
  can: new Set(can),
});

const good = goodSchema.parse({
  goodsId: "g1",
  no: "SHAKE1",
  name: "Chocolate protein shake",
  nameEn: "",
  spec: "300 ml",
  priceInr: 149,
  sort: 1,
  modelId: "1",
  image: { url: "https://cdn.example/g.png", path: "g.png", fileName: "g.png", md5: "x" },
  recipe: [],
  machinesListed: 2,
  version: 3,
  createdAt: null,
  createdBy: null,
  updatedAt: null,
  updatedBy: null,
});

describe("Goods library for a viewer who may only look", () => {
  it("has no new, edit or row menu, and the name is not a link", async () => {
    viewerRef.current = viewer("franchise", ["goodsLibrary.view"]);
    mockFetchGoods.mockResolvedValue({ ok: true, data: { items: [good], total: 1 } });
    render(<AdminMachineGoods />);
    const row = await screen.findByTestId("row-good-g1");
    expect(row).toHaveTextContent("Chocolate protein shake");
    expect(screen.queryByTestId("button-new-good")).not.toBeInTheDocument();
    expect(screen.queryByTestId("edit-g1")).not.toBeInTheDocument();
    expect(screen.queryByTestId("more-g1")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Chocolate protein shake" })).not.toBeInTheDocument();
  });

  it("keeps them for an editor", async () => {
    viewerRef.current = viewer("admin", ["goodsLibrary.view", "goodsLibrary.edit"]);
    mockFetchGoods.mockResolvedValue({ ok: true, data: { items: [good], total: 1 } });
    render(<AdminMachineGoods />);
    await screen.findByTestId("row-good-g1");
    expect(screen.getByTestId("button-new-good")).toBeInTheDocument();
    expect(screen.getByTestId("edit-g1")).toBeInTheDocument();
  });
});

describe("machine page tabs", () => {
  const ids = (can: Permission[]) => visibleTabs(viewer("operator", can)).map((t) => t.id);

  it("shows only the tabs a role has any permission for", () => {
    expect(ids(["settings.facts.view", "stock.view", "remote.clean.edit"])).toEqual(["settings", "stock", "remote"]);
    expect(ids(["settings.facts.view", "pins.operator.view"])).toEqual(["settings", "pin"]);
    expect(ids([])).toEqual([]);
  });
});
