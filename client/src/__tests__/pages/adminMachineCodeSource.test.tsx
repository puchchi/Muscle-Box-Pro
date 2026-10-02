import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { mockFetchCodes, mockFetchCode, mockFetchUses } = vi.hoisted(() => ({
  mockFetchCodes: vi.fn(),
  mockFetchCode: vi.fn(),
  mockFetchUses: vi.fn(),
}));
vi.mock("@/lib/adminMachineApi", () => ({
  fetchRedeemCodes: mockFetchCodes,
  fetchRedeemCode: mockFetchCode,
  fetchRedeemUses: mockFetchUses,
  fetchAllGoods: vi.fn().mockResolvedValue({ ok: true, data: [] }),
  fetchAllMachines: vi.fn().mockResolvedValue({ ok: true, data: [] }),
  deleteRedeemCode: vi.fn(),
  setRedeemCodeDisabled: vi.fn(),
  updateRedeemCode: vi.fn(),
}));
vi.mock("@/pages/admin/useAdminGuard", () => ({
  useAdminGuard: () => ({ state: "ready", session: { email: "a@x.in", role: "admin", displayName: "A", expiresAt: "2030-01-01T00:00:00Z" } }),
}));
vi.mock("@/pages/admin/machines/MachinesShell", () => ({
  MachinesShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("next/link", () => ({
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import { redeemCodeSchema } from "@shared/admin/machinesSchema";
import AdminMachineRedeemCodes from "@/pages/admin/AdminMachineRedeemCodes";
import AdminMachineRedeemCodeDetail from "@/pages/admin/AdminMachineRedeemCodeDetail";

const wire = {
  code: "ADMIN01",
  serialNo: "S1",
  theme: "Launch",
  goods: [{ goodsId: "1001", name: "Chocolate protein shake" }],
  usesAllowed: 1,
  usedCount: 0,
  remaining: 1,
  validFrom: null,
  validTo: null,
  status: "active",
  disabled: false,
  allMachines: true,
  sns: [],
  canDelete: true,
  source: "admin",
  shopOrderId: null,
  lastUsedAt: null,
  version: 1,
  createdAt: null,
  createdBy: null,
  updatedAt: null,
  updatedBy: null,
};

const code = (over: Record<string, unknown> = {}) => redeemCodeSchema.parse({ ...wire, ...over });
const shopCode = code({ code: "48213907", serialNo: "S2", source: "shop_purchase", shopOrderId: "so_123", canDelete: false, allMachines: false, sns: ["GS805TEST01"] });

beforeEach(() => {
  vi.clearAllMocks();
  mockFetchUses.mockResolvedValue({ ok: true, data: { items: [] } });
});

describe("redeem code source", () => {
  it("reads an older backend without a source as an admin code", () => {
    const { source: _s, shopOrderId: _o, ...old } = wire;
    expect(redeemCodeSchema.parse(old)).toMatchObject({ source: "admin", shopOrderId: null });
  });

  it("tags each row with its source and leaves shop codes read-only", async () => {
    mockFetchCodes.mockResolvedValue({ ok: true, data: { items: [code(), shopCode, code({ code: "R1", source: "shop_reward", shopOrderId: "so_9", canDelete: false })], total: 3 } });
    render(<AdminMachineRedeemCodes />);

    expect(await screen.findByTestId("source-ADMIN01")).toHaveTextContent("Admin");
    expect(screen.getByTestId("source-48213907")).toHaveTextContent("Shop purchase");
    expect(screen.getByTestId("source-R1")).toHaveTextContent("Shop reward");
    expect(within(screen.getByTestId("row-code-48213907")).getByText("so_123")).toBeInTheDocument();

    expect(screen.getByTestId("disable-code-ADMIN01")).toBeInTheDocument();
    expect(screen.getByTestId("edit-code-ADMIN01")).toHaveTextContent("Edit");
    expect(screen.queryByTestId("disable-code-48213907")).not.toBeInTheDocument();
    expect(screen.queryByTestId("delete-code-48213907")).not.toBeInTheDocument();
    expect(screen.getByTestId("edit-code-48213907")).toHaveTextContent("View");
  });

  it("filters by source", async () => {
    mockFetchCodes.mockResolvedValue({ ok: true, data: { items: [], total: 0 } });
    render(<AdminMachineRedeemCodes />);
    const user = userEvent.setup();
    await user.selectOptions(await screen.findByTestId("filter-code-source"), "shop_reward");
    await user.click(screen.getByTestId("button-search"));
    expect(mockFetchCodes).toHaveBeenLastCalledWith({ source: "shop_reward" }, 1, 20);
  });

  it("shows a shop code without the form or the disable and delete buttons", async () => {
    mockFetchCode.mockResolvedValue({ ok: true, data: { code: shopCode } });
    render(<AdminMachineRedeemCodeDetail code="48213907" />);

    expect(await screen.findByTestId("shop-code-source")).toHaveTextContent("Shop purchase");
    expect(screen.getByTestId("shop-code-order")).toHaveTextContent("so_123");
    expect(screen.getByTestId("card-code-usage")).toBeInTheDocument();
    expect(screen.queryByTestId("button-save-code")).not.toBeInTheDocument();
    expect(screen.queryByTestId("button-disable-code")).not.toBeInTheDocument();
    expect(screen.queryByTestId("button-delete-code")).not.toBeInTheDocument();
  });
});
