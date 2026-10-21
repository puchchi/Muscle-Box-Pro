import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const api = vi.hoisted(() => ({
  fetchItems: vi.fn(),
  fetchWarehouses: vi.fn(),
  fetchStockBalances: vi.fn(),
  fetchExpiringBatches: vi.fn(),
  receiveStock: vi.fn(),
  writeOffStock: vi.fn(),
  countStock: vi.fn(),
  fetchCostReport: vi.fn(),
  fetchAssets: vi.fn(),
  createAsset: vi.fn(),
  updateAsset: vi.fn(),
}));
const viewer = vi.hoisted(() => ({ can: null as Set<string> | null }));

vi.mock("@/lib/inventoryApi", () => api);
vi.mock("@/pages/admin/machines/viewer", async (importOriginal) => {
  const { adminViewer } = await import("@shared/admin/viewerSchema");
  return {
    ...(await importOriginal<typeof import("@/pages/admin/machines/viewer")>()),
    useMachineGuard: () => {
      const session = adminViewer("A", "a@x.in");
      return { state: "ready", session: viewer.can ? { ...session, can: viewer.can } : session };
    },
  };
});
vi.mock("@/pages/admin/machines/MachinesShell", () => ({
  MachinesShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }), usePathname: () => "/machines/inventory" }));
vi.mock("next/link", () => ({
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import { assetSchema, itemSchema, warehouseSchema } from "@shared/admin/inventorySchema";
import AdminInventoryStock from "@/pages/admin/AdminInventoryStock";
import AdminInventoryCosts from "@/pages/admin/AdminInventoryCosts";
import AdminMachineAssets from "@/pages/admin/AdminMachineAssets";

const item = (over: Record<string, unknown> = {}) =>
  itemSchema.parse({
    itemId: "whey-choc",
    name: "Whey protein, chocolate",
    kind: "protein",
    unit: "g",
    packSize: 1000,
    packLabel: "1 kg bag",
    materialIds: ["m1"],
    reorderLevel: 5000,
    active: true,
    avgCostInr: 1.85,
    onHand: 12000,
    inMachines: 1500,
    low: false,
    version: 1,
    updatedAt: null,
    ...over,
  });

const warehouse = warehouseSchema.parse({ warehouseId: "wh1", name: "Pune central", address: "", active: true, machines: 3, version: 1 });

const ok = <T,>(data: T) => ({ ok: true, data });
const notFound = { ok: false, error: { code: "not_found", message: "Not found", status: 404 } };

beforeEach(() => {
  vi.clearAllMocks();
  viewer.can = null;
  api.fetchItems.mockResolvedValue(ok({ items: [item(), item({ itemId: "cups", name: "Cups 400 ml", kind: "cup", unit: "pcs", packSize: 50, onHand: -20, low: true, avgCostInr: 1.2 })] }));
  api.fetchWarehouses.mockResolvedValue(ok({ items: [warehouse] }));
  api.fetchStockBalances.mockResolvedValue(
    ok({
      items: [
        { place: { kind: "warehouse", id: "wh1", name: "Pune central" }, itemId: "whey-choc", qty: 12000, avgCostInr: 1.85, valueInr: 22200 },
        { place: { kind: "machine", id: "GS1", name: "Gym 1" }, itemId: "whey-choc", qty: 1500, avgCostInr: 1.85, valueInr: 2775 },
      ],
    }),
  );
  api.fetchExpiringBatches.mockResolvedValue(ok({ items: [] }));
});

describe("stock page", () => {
  it("shows each item's stock, value and whether it needs attention", async () => {
    render(<AdminInventoryStock />);
    expect(await screen.findByTestId("row-stock-whey-choc")).toHaveTextContent("12 kg");
    expect(screen.getByTestId("state-whey-choc")).toHaveTextContent("OK");
    expect(screen.getByTestId("state-cups")).toHaveTextContent("Count needed");
    expect(screen.getByTestId("stat-warehouse-value")).toHaveTextContent("22,200");
    expect(screen.getByTestId("stat-low")).toHaveTextContent("1");
  });

  it("asks for a warehouse and items before anything can be received", async () => {
    api.fetchWarehouses.mockResolvedValue(ok({ items: [] }));
    render(<AdminInventoryStock />);
    expect(await screen.findByTestId("stock-setup")).toBeInTheDocument();
    expect(screen.queryByTestId("button-receive")).not.toBeInTheDocument();
  });

  it("hides the stock buttons from someone who can only look", async () => {
    viewer.can = new Set(["inventory.view"]);
    render(<AdminInventoryStock />);
    await screen.findByTestId("row-stock-whey-choc");
    expect(screen.queryByTestId("button-receive")).not.toBeInTheDocument();
  });

  it("says the server has no inventory yet instead of a raw error", async () => {
    api.fetchItems.mockResolvedValue(notFound);
    render(<AdminInventoryStock />);
    expect(await screen.findByTestId("stock-error")).toHaveTextContent("doesn't keep inventory yet");
  });

  it("receives an invoice as total grams and line cost before GST", async () => {
    api.receiveStock.mockResolvedValue(ok({ movements: [] }));
    const user = userEvent.setup();
    render(<AdminInventoryStock />);
    await user.click(await screen.findByTestId("button-receive"));
    const dialog = screen.getByTestId("receive-dialog");

    await user.click(within(dialog).getByTestId("button-save-receipt"));
    expect(api.receiveStock).not.toHaveBeenCalled();
    expect(within(dialog).getByTestId("error-supplier")).toBeInTheDocument();

    await user.type(within(dialog).getByTestId("input-supplier"), "Nutrabay");
    await user.type(within(dialog).getByTestId("input-invoiceNo"), "INV-7");
    await user.selectOptions(within(dialog).getByTestId("input-line-0-item"), "whey-choc");
    await user.type(within(dialog).getByTestId("input-line-0-packs"), "10");
    await user.type(within(dialog).getByTestId("input-line-0-price"), "1850");
    await user.type(within(dialog).getByTestId("input-line-0-gst"), "3330");
    expect(within(dialog).getByTestId("receipt-total")).toHaveTextContent("18,500");

    await user.click(within(dialog).getByTestId("button-save-receipt"));
    expect(within(dialog).getByTestId("error-line-0-expires")).toBeInTheDocument();
    await user.type(within(dialog).getByTestId("input-line-0-expires"), "2099-01-31");
    await user.click(within(dialog).getByTestId("button-save-receipt"));

    expect(api.receiveStock).toHaveBeenCalledWith(
      expect.objectContaining({
        warehouseId: "wh1",
        supplier: "Nutrabay",
        invoiceNo: "INV-7",
        lines: [expect.objectContaining({ itemId: "whey-choc", qty: 10000, lineCostInr: 18500, gstInr: 3330, expiresOn: "2099-01-31" })],
      }),
    );
    expect(await screen.findByTestId("stock-notice")).toHaveTextContent("invoice INV-7");
  });
});

describe("cost of drinks page", () => {
  it("shows cost per drink, what is left after ingredients and the unpriced warning", async () => {
    api.fetchCostReport.mockResolvedValue(
      ok({
        month: "2026-10",
        totals: { salesInr: 20000, drinks: 100, cogsInr: 6000, wastageInr: 300, unpricedDrinks: 4 },
        byItem: [{ itemId: "whey-choc", name: "Whey protein, chocolate", unit: "g", consumedQty: 3000, cogsInr: 5550, wastedQty: 0, wastageInr: 0 }],
        byMachine: [{ sn: "GS1", machineName: "Gym 1", drinks: 100, salesInr: 20000, cogsInr: 6000, wastageInr: 300 }],
      }),
    );
    render(<AdminInventoryCosts />);
    expect(await screen.findByTestId("stat-per-drink")).toHaveTextContent("60");
    expect(screen.getByTestId("stat-margin")).toHaveTextContent("70");
    expect(screen.getByTestId("unpriced-note")).toHaveTextContent("4 drinks were");
    expect(screen.getByTestId("row-cost-item-whey-choc")).toHaveTextContent("3 kg");
    expect(api.fetchCostReport).toHaveBeenCalledWith(expect.stringMatching(/^\d{4}-\d{2}$/));
  });
});

const asset = (over: Record<string, unknown> = {}) =>
  assetSchema.parse({
    assetId: "a1",
    serialNo: "GS805-0001",
    sn: "GS1",
    model: "GS805",
    purchasedOn: "2026-06-01",
    costInr: 400000,
    gstInr: 72000,
    landedCostInr: 25000,
    status: "deployed",
    warehouseId: null,
    placement: { machineName: "Gym 1", gymName: "Iron Gym", franchiseName: "North Pune" },
    version: 1,
    updatedAt: null,
    ...over,
  });

describe("machine assets page", () => {
  beforeEach(() => {
    api.fetchAssets.mockResolvedValue(
      ok({ items: [asset(), asset({ assetId: "a2", serialNo: "GS805-0002", sn: null, status: "in_warehouse", warehouseId: "wh1", placement: null })] }),
    );
  });

  it("counts what we invested without GST and which machines are not earning", async () => {
    render(<AdminMachineAssets />);
    expect(await screen.findByTestId("stat-invested")).toHaveTextContent("8,50,000");
    expect(screen.getByTestId("stat-idle")).toHaveTextContent("1");
    expect(screen.getByTestId("row-asset-a1")).toHaveTextContent("Iron Gym, North Pune");
    expect(screen.getByTestId("row-asset-a2")).toHaveTextContent("Pune central");
  });

  it("needs an SN before a machine can be marked as at a gym", async () => {
    const user = userEvent.setup();
    render(<AdminMachineAssets />);
    await user.click(await screen.findByTestId("button-add-asset"));
    const dialog = screen.getByTestId("asset-dialog");
    await user.type(within(dialog).getByTestId("input-serialNo"), "GS805-0003");
    await user.type(within(dialog).getByTestId("input-cost"), "400000");
    await user.selectOptions(within(dialog).getByTestId("input-status"), "deployed");
    await user.click(within(dialog).getByTestId("button-save-asset"));
    expect(within(dialog).getByTestId("error-sn")).toBeInTheDocument();
    expect(api.createAsset).not.toHaveBeenCalled();
  });
});
