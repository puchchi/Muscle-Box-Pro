import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { mockFetchMaterials, mockFetchGoods, mockFetchModels } = vi.hoisted(() => ({
  mockFetchMaterials: vi.fn(),
  mockFetchGoods: vi.fn(),
  mockFetchModels: vi.fn(),
}));
vi.mock("@/lib/adminMachineApi", () => ({
  fetchMaterials: mockFetchMaterials,
  uploadGoodsPicture: vi.fn(),
  fetchGoods: mockFetchGoods,
  fetchModels: mockFetchModels,
  deleteGood: vi.fn(),
  setGoodListing: vi.fn(),
}));
vi.mock("@/pages/admin/useAdminGuard", () => ({
  useAdminGuard: () => ({ state: "ready", session: { email: "a@x.in", role: "admin", displayName: "A", expiresAt: "2030-01-01T00:00:00Z" } }),
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

import { goodSchema, machineGoodSchema, type Good } from "@shared/admin/machinesSchema";
import { GoodEditor } from "@/pages/admin/machines/GoodEditor";
import AdminMachineGoods from "@/pages/admin/AdminMachineGoods";

const wire = {
  goodsId: "g1",
  no: "SHAKE1",
  name: "Mango protein shake",
  nameEn: "",
  spec: "300 ml",
  priceInr: 149,
  sort: 1,
  modelId: "1",
  image: { url: "https://cdn.example/g.png", path: "g.png", fileName: "g.png", md5: "x" },
  recipe: [{ materialId: "powder1", qty: 30, waterQty: 0, waterType: 1, kqty: 0 }],
  machinesListed: 2,
  version: 3,
  createdAt: null,
  createdBy: null,
  updatedAt: null,
  updatedBy: null,
};

const good = (over: Record<string, unknown> = {}): Good => goodSchema.parse({ ...wire, ...over });

const materials = [
  { materialId: "powder1", name: "Whey", position: "1", rawType: "powder", unit: "g", capacity: 1000, warnCapacity: 100, expendRate: 1, enabled: true },
];

beforeEach(() => {
  vi.clearAllMocks();
  mockFetchMaterials.mockResolvedValue({ ok: true, data: { items: materials } });
  mockFetchModels.mockResolvedValue({ ok: true, data: { items: [{ id: "1", name: "GS805", protocol: "2_000", versions: "1.0" }] } });
});

describe("comingSoon in the schemas", () => {
  it("reads missing, null and false as off, and true as on", () => {
    expect(goodSchema.parse(wire).comingSoon).toBe(false);
    expect(good({ comingSoon: null }).comingSoon).toBe(false);
    expect(good({ comingSoon: false }).comingSoon).toBe(false);
    expect(good({ comingSoon: true }).comingSoon).toBe(true);
  });

  it("reads a per-machine row without the field as off", () => {
    const row = {
      goodsId: "g1",
      no: "SHAKE1",
      name: "Mango",
      nameEn: "",
      spec: "",
      image: null,
      libraryPriceInr: 149,
      devicePriceInr: null,
      shownPriceInr: 149,
      listed: true,
      soldOut: false,
      sort: 1,
      updatedAt: null,
      updatedBy: null,
    };
    expect(machineGoodSchema.parse(row).comingSoon).toBe(false);
    expect(machineGoodSchema.parse({ ...row, comingSoon: true }).comingSoon).toBe(true);
  });
});

describe("GoodEditor Coming soon switch", () => {
  async function renderEditor(start: Good | null) {
    const onSubmit = vi.fn().mockResolvedValue({ ok: true, data: { good: start ?? good(), machinesUpdated: 2 } });
    render(<GoodEditor good={start} models={[{ id: "1", name: "GS805", protocol: "2_000", versions: "1.0" }]} onSubmit={onSubmit} />);
    await screen.findByTestId("field-coming-soon");
    await vi.waitFor(() => expect(mockFetchMaterials).toHaveBeenCalled());
    return onSubmit;
  }

  it("is off by default and sends false", async () => {
    const onSubmit = await renderEditor(good());
    expect(screen.getByTestId("switch-coming-soon")).toHaveAttribute("aria-checked", "false");
    await userEvent.click(screen.getByTestId("button-save-good"));
    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0]![0].comingSoon).toBe(false);
  });

  it("sends true and shows the pill when turned on", async () => {
    const onSubmit = await renderEditor(good());
    await userEvent.click(screen.getByTestId("switch-coming-soon"));
    expect(screen.getByTestId("coming-soon-pill")).toHaveTextContent("Coming soon");
    await userEvent.click(screen.getByTestId("button-save-good"));
    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0]![0].comingSoon).toBe(true);
  });

  it("allows an empty recipe only while it is on", async () => {
    const empty = good({ recipe: [] });
    const onSubmit = await renderEditor(empty);
    await userEvent.click(screen.getByTestId("button-save-good"));
    expect(await screen.findByTestId("good-error")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();

    await userEvent.click(screen.getByTestId("switch-coming-soon"));
    await userEvent.click(screen.getByTestId("button-save-good"));
    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0]![0]).toMatchObject({ comingSoon: true, recipe: [] });
  });

  it("still checks a recipe line that was started", async () => {
    const onSubmit = await renderEditor(good({ comingSoon: true, recipe: [] }));
    await userEvent.click(screen.getByTestId("button-add-line"));
    await userEvent.type(document.getElementById("recipe-0-amount")!, "20");
    await userEvent.click(screen.getByTestId("button-save-good"));
    expect(await screen.findByText("Choose a material.")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

describe("goods list Coming soon", () => {
  it("shows the pill only on coming-soon drinks", async () => {
    mockFetchGoods.mockResolvedValue({
      ok: true,
      data: { items: [good({ goodsId: "a", comingSoon: true }), good({ goodsId: "b" })], total: 2 },
    });
    render(<AdminMachineGoods />);
    expect(await screen.findByTestId("coming-soon-a")).toHaveTextContent("Coming soon");
    expect(screen.queryByTestId("coming-soon-b")).not.toBeInTheDocument();
  });

  it("filters by status, on the server and on the rows returned", async () => {
    mockFetchGoods.mockResolvedValue({
      ok: true,
      data: { items: [good({ goodsId: "a", comingSoon: true }), good({ goodsId: "b" })], total: 2 },
    });
    render(<AdminMachineGoods />);
    await screen.findByTestId("row-good-a");

    await userEvent.selectOptions(screen.getByTestId("filter-status"), "yes");
    await userEvent.click(screen.getByRole("button", { name: /search/i }));

    await vi.waitFor(() => expect(mockFetchGoods).toHaveBeenLastCalledWith(expect.objectContaining({ comingSoon: "yes" }), 1, 20));
    await vi.waitFor(() => expect(screen.queryByTestId("row-good-b")).not.toBeInTheDocument());
    expect(screen.getByTestId("row-good-a")).toBeInTheDocument();
  });
});
