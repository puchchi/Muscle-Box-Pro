import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { mockFetch, mockSet } = vi.hoisted(() => ({ mockFetch: vi.fn(), mockSet: vi.fn() }));
vi.mock("@/lib/adminMachineApi", () => ({ fetchQrSettings: mockFetch, setQrSettings: mockSet, uploadMachineFile: vi.fn() }));
vi.mock("@/pages/admin/useAdminGuard", () => ({
  useAdminGuard: () => ({ state: "ready", session: { email: "a@x.in", role: "admin", displayName: "A", expiresAt: "2030-01-01T00:00:00Z" } }),
}));
vi.mock("@/pages/admin/machines/MachinesShell", () => ({
  MachinesShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import AdminMachineQr from "@/pages/admin/AdminMachineQr";

const settings = {
  logo: null,
  memberQr: null,
  memberTip: "",
  exchangeQr: null,
  exchangeTip: "",
  memberLink: "",
  exchangeLink: "",
  instagramLink: "https://www.instagram.com/mbp.andheri/",
  version: 4,
  updatedAt: null,
  updatedBy: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockFetch.mockResolvedValue({ ok: true, data: { settings } });
  mockSet.mockResolvedValue({ ok: true, data: { settings: { ...settings, instagramLink: "" }, restartPending: 0 } });
});

describe("QR and logo: Instagram page", () => {
  it("refuses another host and http, then sends an empty field as cleared", async () => {
    render(<AdminMachineQr />);
    const field = await screen.findByTestId("input-instagramLink");
    expect(field).toHaveValue("https://www.instagram.com/mbp.andheri/");

    await userEvent.clear(field);
    await userEvent.type(field, "http://www.instagram.com/mbp/");
    await userEvent.click(screen.getByTestId("button-save-qr"));
    expect(await screen.findByTestId("error-instagramLink")).toHaveTextContent("Use the profile link, like https://www.instagram.com/muscleboxpro/");
    expect(mockSet).not.toHaveBeenCalled();

    await userEvent.clear(field);
    await userEvent.click(screen.getByTestId("button-save-qr"));
    await vi.waitFor(() => expect(mockSet).toHaveBeenCalled());
    expect(mockSet.mock.calls[0]![0]).toMatchObject({ instagramLink: "" });
    expect(mockSet.mock.calls[0]![1]).toBe(4);
  });
});
