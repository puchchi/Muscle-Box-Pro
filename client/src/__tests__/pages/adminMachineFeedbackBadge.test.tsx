import { describe, expect, it, vi } from "vitest";
import { act, render, screen, within } from "@testing-library/react";

const { mockList } = vi.hoisted(() => ({ mockList: vi.fn() }));
vi.mock("@/lib/adminMachineApi", () => ({ listFeedback: mockList }));
vi.mock("@/pages/admin/machines/viewer", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/pages/admin/machines/viewer")>()),
  useMachineSignOut: () => vi.fn(),
}));
vi.mock("@/lib/apiClient", () => ({ apiBaseUrl: () => "https://api.example" }));
vi.mock("@/lib/machineConsoleSignIn", () => ({ signOutOfMachineConsole: vi.fn() }));
vi.mock("next/link", () => ({
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import { MachinesShell } from "@/pages/admin/machines/MachinesShell";
import { adjustNewFeedbackCount, setNewFeedbackCount } from "@/pages/admin/machines/newFeedbackCount";
import { adminViewer, type MachineViewer, type Permission } from "@shared/admin/viewerSchema";

const session = adminViewer("A", "a@x.in");

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
      ["machines", "statistics", "logs", "operators"],
      ["orders", "shopOrders", "customers", "redeemCodes", "feedback"],
      ["goods", "materials", "discounts", "newProducts"],
      ["ads", "voices", "qr"],
    ]);
    expect(within(groups[3]!).getByTestId("machines-tab-qr")).toHaveAttribute("aria-current", "page");
  });
});

const viewer = (role: MachineViewer["role"], can: Permission[]): MachineViewer => ({
  role,
  name: "Pune Fitness",
  email: "p@x.in",
  operatorId: null,
  franchiseId: role === "franchise" ? "f1" : null,
  gymId: role === "gym" ? "g1" : null,
  can: new Set(can),
});

describe("Machine menu for other roles", () => {
  it("shows an operator only the pages it can open, with no back link and no feedback fetch", () => {
    mockList.mockClear();
    render(
      <MachinesShell session={viewer("operator", ["machines.list.view", "stock.view"])} section="machines">
        x
      </MachinesShell>,
    );
    expect(screen.getAllByRole("group").map((g) => g.getAttribute("aria-label"))).toEqual(["Fleet"]);
    expect(screen.getAllByRole("link", { name: /machines$/i }).length).toBeGreaterThan(0);
    expect(screen.queryByTestId("machines-tab-feedback")).not.toBeInTheDocument();
    expect(screen.queryByTestId("link-back-to-admin")).not.toBeInTheDocument();
    expect(screen.queryByTestId("admin-api-host")).not.toBeInTheDocument();
    expect(screen.getByTestId("shell-admin")).toHaveTextContent("Pune Fitness");
    expect(screen.getByTestId("shell-admin")).toHaveTextContent("Operator");
    expect(mockList).not.toHaveBeenCalled();
  });

  it("puts a franchise's own pages first in the menu and blocks a console page it can't open", () => {
    render(
      <MachinesShell session={viewer("franchise", ["machines.list.view", "orders.view"])} section="customers">
        secret
      </MachinesShell>,
    );
    expect(screen.getAllByRole("group").map((g) => g.getAttribute("aria-label"))).toEqual(["Your franchise", "Fleet", "Sales"]);
    expect(screen.getByTestId("machines-tab-overview")).toHaveAttribute("href", "/franchise/dashboard");
    expect(screen.getByTestId("machines-tab-record")).toHaveAttribute("href", "/franchise/dashboard/record");
    expect(screen.queryByTestId("machines-tab-payouts")).not.toBeInTheDocument();
    expect(screen.queryByTestId("link-back-to-admin")).not.toBeInTheDocument();
    expect(screen.getByTestId("machines-no-access")).toBeInTheDocument();
    expect(screen.queryByText("secret")).not.toBeInTheDocument();
  });
});
