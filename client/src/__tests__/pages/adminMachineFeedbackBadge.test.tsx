import { describe, expect, it, vi } from "vitest";
import { act, render, screen, within } from "@testing-library/react";

const { mockList } = vi.hoisted(() => ({ mockList: vi.fn() }));
vi.mock("@/lib/adminMachineApi", () => ({ listFeedback: mockList }));
vi.mock("@/pages/admin/AdminShell", () => ({ useAdminSignOut: () => vi.fn() }));
vi.mock("@/lib/apiClient", () => ({ apiBaseUrl: () => "https://api.example" }));
vi.mock("next/link", () => ({
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import { MachinesShell } from "@/pages/admin/machines/MachinesShell";
import { adjustNewFeedbackCount, setNewFeedbackCount } from "@/pages/admin/machines/newFeedbackCount";

const session = { email: "a@x.in", role: "admin", displayName: "A", expiresAt: "2030-01-01T00:00:00Z" } as const;

describe("Feedback in the machine menu", () => {
  it("fetches the new count once and shows it, then follows changes", async () => {
    mockList.mockResolvedValue({ ok: true, data: { items: [], nextCursor: null, newCount: 3, counts: null } });
    const { rerender } = render(
      <MachinesShell session={session} section="orders">
        x
      </MachinesShell>,
    );
    expect(screen.getByTestId("machines-tab-feedback")).toHaveAttribute("href", "/machines/feedback");
    expect(await screen.findByTestId("badge-new-feedback")).toHaveTextContent("3 new");
    expect(mockList).toHaveBeenCalledWith({ state: "new" }, null, 1);

    rerender(
      <MachinesShell session={session} section="feedback">
        y
      </MachinesShell>,
    );
    expect(mockList).toHaveBeenCalledTimes(1);

    act(() => adjustNewFeedbackCount(-1));
    expect(screen.getByTestId("badge-new-feedback")).toHaveTextContent("2 new");

    act(() => setNewFeedbackCount(0));
    expect(screen.queryByTestId("badge-new-feedback")).not.toBeInTheDocument();
  });
});

describe("Machine menu groups", () => {
  it("puts every page under one of four named groups, and marks the current one", () => {
    mockList.mockResolvedValue({ ok: true, data: { items: [], nextCursor: null, newCount: 0, counts: null } });
    render(
      <MachinesShell session={session} section="qr">
        x
      </MachinesShell>,
    );
    const groups = screen.getAllByRole("group");
    expect(groups.map((g) => g.getAttribute("aria-label"))).toEqual(["Fleet", "Sales", "Menu", "On screen"]);
    const ids = (g: HTMLElement) => within(g).getAllByRole("link").map((a) => a.dataset.testid?.replace("machines-tab-", ""));
    expect(groups.map(ids)).toEqual([
      ["machines", "statistics", "logs"],
      ["orders", "shopOrders", "customers", "redeemCodes", "feedback"],
      ["goods", "materials", "discounts", "newProducts"],
      ["ads", "voices", "qr"],
    ]);
    expect(within(groups[3]!).getByTestId("machines-tab-qr")).toHaveAttribute("aria-current", "page");
  });
});
