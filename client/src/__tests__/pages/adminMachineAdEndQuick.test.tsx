import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { mockFetchAd, mockFetchAllMachines } = vi.hoisted(() => ({
  mockFetchAd: vi.fn(),
  mockFetchAllMachines: vi.fn(),
}));
vi.mock("@/lib/adminMachineApi", () => ({
  fetchAd: mockFetchAd,
  fetchAllMachines: mockFetchAllMachines,
  setAdSchedules: vi.fn(),
  updateAd: vi.fn(),
  uploadMachineFile: vi.fn(),
  contentTypeOf: vi.fn(),
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

import { addMonths, istNowInput, quickEnd } from "@/pages/admin/machines/adRules";
import AdminMachineAdDetail from "@/pages/admin/AdminMachineAdDetail";

describe("addMonths", () => {
  it("keeps the day and time", () => {
    expect(addMonths("2026-10-02T09:30", 1)).toBe("2026-11-02T09:30");
    expect(addMonths("2026-10-02T09:30", 6)).toBe("2027-04-02T09:30");
    expect(addMonths("2026-10-02T09:30", 12)).toBe("2027-10-02T09:30");
  });

  it("clamps to the last day of a shorter month", () => {
    expect(addMonths("2026-01-31T10:00", 1)).toBe("2026-02-28T10:00");
    expect(addMonths("2027-11-30T10:00", 3)).toBe("2028-02-29T10:00");
    expect(addMonths("2026-08-31T23:59", 1)).toBe("2026-09-30T23:59");
  });

  it("returns empty for a value that isn't a time", () => {
    expect(addMonths("", 1)).toBe("");
    expect(addMonths("2026-10-02", 1)).toBe("");
  });
});

describe("quickEnd", () => {
  const now = Date.parse("2026-10-02T20:00:00Z");

  it("reads now in IST", () => {
    expect(istNowInput(now)).toBe("2026-10-03T01:30");
  });

  it("counts from the start when there is one, else from now", () => {
    expect(quickEnd("2026-12-25T08:00", 3, now)).toBe("2027-03-25T08:00");
    expect(quickEnd("", 1, now)).toBe("2026-11-03T01:30");
  });
});

describe("ad schedule End quick picks", () => {
  const ad = {
    adId: "AD1",
    no: "1",
    name: "Launch",
    description: "",
    type: "image",
    file: { url: "https://cdn.example/a.png", path: "a.png", fileName: "a.png", md5: "x" },
    schedules: [{ id: "s1", allMachines: true, sns: [], startAt: "2026-10-05T10:00:00+05:30", endAt: null, sort: 1 }],
    version: 1,
    createdAt: null,
    createdBy: null,
    updatedAt: null,
    updatedBy: null,
  };

  beforeEach(() => {
    mockFetchAd.mockResolvedValue({ ok: true, data: { ad } });
    mockFetchAllMachines.mockResolvedValue({ ok: true, data: [] });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sets End from the row's Start", async () => {
    render(<AdminMachineAdDetail adId="AD1" />);
    await userEvent.click(await screen.findByTestId("end-quick-3-0"));
    expect(screen.getByTestId("end-0")).toHaveValue("2027-01-05T10:00");
    await userEvent.click(screen.getByTestId("end-quick-12-0"));
    expect(screen.getByTestId("end-0")).toHaveValue("2027-10-05T10:00");
  });

  it("sets End from now on a new row with no Start", async () => {
    vi.spyOn(Date, "now").mockReturnValue(Date.parse("2026-10-02T04:30:00Z"));
    render(<AdminMachineAdDetail adId="AD1" />);
    await userEvent.click(await screen.findByTestId("button-add-row"));
    await userEvent.click(screen.getByTestId("end-quick-1-1"));
    expect(screen.getByTestId("end-1")).toHaveValue("2026-11-02T10:00");
    expect(screen.getByTestId("start-1")).toHaveValue("");
  });
});
