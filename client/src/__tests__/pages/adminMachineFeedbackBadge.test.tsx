import { describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";

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
