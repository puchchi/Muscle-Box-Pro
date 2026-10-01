import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const { mockFetchGoods, mockFetchMachineGoods } = vi.hoisted(() => ({
  mockFetchGoods: vi.fn(),
  mockFetchMachineGoods: vi.fn(),
}));
vi.mock("@/lib/adminMachineApi", () => ({
  fetchGoods: mockFetchGoods,
  fetchModels: vi.fn().mockResolvedValue({ ok: true, data: { items: [] } }),
  deleteGood: vi.fn(),
  setGoodListing: vi.fn(),
  fetchMachineGoods: mockFetchMachineGoods,
  fetchAvailableGoods: vi.fn(),
  addMachineGoods: vi.fn(),
  updateMachineGoods: vi.fn(),
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

import { goodSchema, machineGoodSchema } from "@shared/admin/machinesSchema";
import AdminMachineGoods from "@/pages/admin/AdminMachineGoods";
import { MachineGoodsTab } from "@/pages/admin/machines/MachineGoodsTab";

const libraryWire = {
  goodsId: "g1",
  no: "SHAKE1",
  name: "Mango protein shake",
  nameEn: "",
  spec: "300 ml",
  priceInr: 149,
  sort: 1,
  modelId: "1",
  image: null,
  recipe: [{ materialId: "powder1", qty: 30, waterQty: 0, waterType: 1, kqty: 0 }],
  machinesListed: 2,
  version: 3,
  createdAt: null,
  createdBy: null,
  updatedAt: null,
  updatedBy: null,
};

const machineWire = {
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

beforeEach(() => vi.clearAllMocks());

describe("rating in the schemas", () => {
  it("reads missing, null and zero reviews as no rating", () => {
    expect(goodSchema.parse(libraryWire).rating).toBeNull();
    expect(goodSchema.parse({ ...libraryWire, rating: null }).rating).toBeNull();
    expect(goodSchema.parse({ ...libraryWire, rating: { avg: 0, count: 0 } }).rating).toBeNull();
    expect(machineGoodSchema.parse(machineWire).rating).toBeNull();
  });

  it("keeps a rating with reviews", () => {
    expect(goodSchema.parse({ ...libraryWire, rating: { avg: 4.6, count: 23 } }).rating).toEqual({ avg: 4.6, count: 23 });
    expect(machineGoodSchema.parse({ ...machineWire, rating: { avg: 5, count: 1 } }).rating).toEqual({ avg: 5, count: 1 });
  });
});

describe("goods library Rating column", () => {
  it("shows the stars and links to reviews, or a dash when there are none", async () => {
    mockFetchGoods.mockResolvedValue({
      ok: true,
      data: {
        items: [
          goodSchema.parse({ ...libraryWire, goodsId: "a", rating: { avg: 4.62, count: 23 } }),
          goodSchema.parse({ ...libraryWire, goodsId: "b" }),
        ],
        total: 2,
      },
    });
    render(<AdminMachineGoods />);
    const rated = await screen.findByTestId("rating-a");
    expect(rated).toHaveTextContent("★ 4.6 (23)");
    expect(rated).toHaveAttribute("href", "/machines/feedback?type=review");
    expect(rated).toHaveAccessibleName("Rated 4.6 out of 5 from 23 reviews. Open reviews.");
    expect(screen.getByTestId("rating-b")).toHaveTextContent("—");
    expect(screen.getByTestId("rating-b").tagName).not.toBe("A");
  });
});

describe("machine goods Rating column", () => {
  it("links to this machine's reviews", async () => {
    mockFetchMachineGoods.mockResolvedValue({
      ok: true,
      data: { items: [machineGoodSchema.parse({ ...machineWire, rating: { avg: 5, count: 1 } })] },
    });
    render(<MachineGoodsTab sn="SN 1" />);
    const rated = await screen.findByTestId("rating-g1");
    expect(rated).toHaveTextContent("★ 5.0 (1)");
    expect(rated).toHaveAttribute("href", "/machines/feedback?type=review&sn=SN+1");
    expect(rated).toHaveAccessibleName("Rated 5.0 out of 5 from 1 review. Open reviews.");
  });
});
