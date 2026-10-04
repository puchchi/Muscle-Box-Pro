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

import { goodSchema, type Good } from "@shared/admin/machinesSchema";
import { GoodEditor } from "@/pages/admin/machines/GoodEditor";
import AdminMachineGoods from "@/pages/admin/AdminMachineGoods";

const wire = {
  goodsId: "g1",
  no: "SHAKE1",
  name: "Chocolate protein shake",
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

describe("serveTemp in the goods schema", () => {
  it("reads a missing or null field as normal", () => {
    expect(goodSchema.parse(wire).serveTemp).toBeNull();
    expect(good({ serveTemp: null }).serveTemp).toBeNull();
  });

  it("keeps chilled and hot", () => {
    expect(good({ serveTemp: "chilled" }).serveTemp).toBe("chilled");
    expect(good({ serveTemp: "hot" }).serveTemp).toBe("hot");
  });

  it("refuses a value the machine doesn't know", () => {
    expect(goodSchema.safeParse({ ...wire, serveTemp: "cold" }).success).toBe(false);
  });
});

describe("GoodEditor Served control", () => {
  async function save(start: Good, pick?: "normal" | "chilled" | "hot") {
    const onSubmit = vi.fn().mockResolvedValue({ ok: true, data: { good: start, machinesUpdated: 2 } });
    render(<GoodEditor good={start} models={[]} onSubmit={onSubmit} />);
    await screen.findByTestId("field-serve-temp");
    await vi.waitFor(() => expect(mockFetchMaterials).toHaveBeenCalled());
    if (pick) await userEvent.click(screen.getByTestId(`serve-temp-${pick}`));
    await userEvent.click(screen.getByTestId("button-save-good"));
    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalled());
    return onSubmit.mock.calls[0]![0];
  }

  it("sends null for Normal", async () => {
    expect((await save(good({ serveTemp: "hot" }), "normal")).serveTemp).toBeNull();
  });

  it("sends the chosen temperature and shows its sticker", async () => {
    expect((await save(good(), "chilled")).serveTemp).toBe("chilled");
    expect(screen.getByTestId("serve-temp-pill")).toHaveTextContent("Chilled");
  });

  it("starts on the stored value", async () => {
    render(<GoodEditor good={good({ serveTemp: "hot" })} models={[]} onSubmit={vi.fn()} />);
    await vi.waitFor(() => expect(mockFetchMaterials).toHaveBeenCalled());
    await screen.findByTestId("field-serve-temp");
    expect(screen.getByTestId("serve-temp-hot")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("serve-temp-normal")).toHaveAttribute("aria-pressed", "false");
  });

  it("shows the server's field error under the control", async () => {
    const onSubmit = vi.fn().mockResolvedValue({
      ok: false,
      error: { code: "validation", message: "Check the fields.", fieldErrors: { serveTemp: "Must be chilled, hot or empty." } },
      issues: [],
    });
    render(<GoodEditor good={good()} models={[]} onSubmit={onSubmit} />);
    await screen.findByTestId("field-serve-temp");
    await vi.waitFor(() => expect(mockFetchMaterials).toHaveBeenCalled());
    await userEvent.click(screen.getByTestId("button-save-good"));
    expect(await screen.findByTestId("error-serveTemp")).toHaveTextContent("Must be chilled, hot or empty.");
  });
});

describe("goods list Served column", () => {
  it("shows Chilled, Hot or a dash", async () => {
    mockFetchGoods.mockResolvedValue({
      ok: true,
      data: { items: [good({ goodsId: "a", serveTemp: "chilled" }), good({ goodsId: "b", serveTemp: "hot" }), good({ goodsId: "c" })], total: 3 },
    });
    render(<AdminMachineGoods />);

    expect(await screen.findByTestId("serve-temp-a")).toHaveTextContent("Chilled");
    expect(screen.getByTestId("serve-temp-b")).toHaveTextContent("Hot");
    expect(screen.getByTestId("serve-temp-c")).toHaveTextContent("—");
    expect(screen.getByRole("columnheader", { name: "Served" })).toBeInTheDocument();
  });
});
