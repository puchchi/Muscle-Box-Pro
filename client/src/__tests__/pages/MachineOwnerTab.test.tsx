import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Machine } from "@shared/admin/machinesSchema";

vi.mock("next/link", () => ({
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const { mockOwner, mockMove, mockFranchises, mockGyms, mockNetwork } = vi.hoisted(() => ({
  mockOwner: vi.fn(),
  mockMove: vi.fn(),
  mockFranchises: vi.fn(),
  mockGyms: vi.fn(),
  mockNetwork: vi.fn(),
}));
vi.mock("@/lib/adminOwnershipApi", () => ({
  fetchMachineOwner: mockOwner,
  moveMachine: mockMove,
  fetchActiveFranchises: mockFranchises,
  fetchGymsWithoutMachine: mockGyms,
  fetchFranchiseNetwork: mockNetwork,
}));

import { MachineOwnerTab } from "@/pages/admin/machines/MachineOwnerTab";

const machine = { sn: "MBP-000241", modelName: "MBP Pro" } as Machine;
const empty = { franchiseId: null, franchiseName: null, gymId: null, gymName: null };
const placed = { ...empty, gymId: "gym_titan", gymName: "Titan Strength", ownerState: "placed" as const, since: "2026-09-30T10:00:00.000Z", version: 3 };

const ownerReply = (migrated = true) => ({
  ok: true,
  data: {
    sn: "MBP-000241",
    migrated,
    owner: placed,
    history: [{ version: 3, at: "2026-09-30T10:00:00.000Z", by: "ops@musclebox.pro", reason: "assign", from: empty, to: placed }],
  },
});

beforeEach(() => {
  vi.clearAllMocks();
  mockFranchises.mockResolvedValue({ ok: true, data: [{ franchiseId: "fr_northline", name: "Northline Nutrition" }] });
  mockGyms.mockResolvedValue({ ok: true, data: [] });
  mockNetwork.mockResolvedValue({
    ok: true,
    data: { franchiseId: "fr_northline", franchiseName: "Northline Nutrition", status: "active", machineAllocation: null, machineCount: 0, overAllocated: false, gyms: [], unplacedMachines: [] },
  });
});

describe("MachineOwnerTab", () => {
  it("shows the owner and its history", async () => {
    mockOwner.mockResolvedValue(ownerReply());
    render(<MachineOwnerTab machine={machine} onChanged={vi.fn()} />);

    expect(await screen.findByTestId("owner-state")).toHaveTextContent("At a gym");
    expect(screen.getByTestId("owner-gym")).toHaveTextContent("Titan Strength");
    expect(screen.getByTestId("owner-franchise")).toHaveTextContent("MBP-direct");
    const row = screen.getByTestId("owner-history-3");
    expect(within(row).getByText("Moved by an admin")).toBeInTheDocument();
    expect(within(row).getByText("MBP stock")).toBeInTheDocument();
  });

  it("will not move a machine the migration hasn't reached", async () => {
    mockOwner.mockResolvedValue(ownerReply(false));
    render(<MachineOwnerTab machine={machine} onChanged={vi.fn()} />);

    expect(await screen.findByTestId("owner-unmigrated")).toHaveTextContent("Titan Strength");
    expect(screen.getByTestId("button-open-move")).toBeDisabled();
  });

  it("moves a placed machine to a franchise with the version it read", async () => {
    mockOwner.mockResolvedValue(ownerReply());
    mockMove.mockResolvedValue({
      ok: true,
      data: { sn: "MBP-000241", changed: true, owner: { ...empty, franchiseId: "fr_northline", franchiseName: "Northline Nutrition", ownerState: "franchise_unplaced", since: null, version: 4 } },
    });
    const onChanged = vi.fn();
    render(<MachineOwnerTab machine={machine} onChanged={onChanged} />);
    const user = userEvent.setup();

    await user.click(await screen.findByTestId("button-open-move"));
    expect(screen.getByTestId("move-to-stock")).toBeChecked();
    expect(screen.getByTestId("move-stock-note")).toHaveTextContent("Titan Strength will have no machine");

    await user.click(screen.getByTestId("move-to-franchise"));
    await waitFor(() => expect(screen.getByRole("option", { name: "Northline Nutrition" })).toBeInTheDocument());
    await user.selectOptions(screen.getByLabelText("Franchise"), "fr_northline");
    await user.click(screen.getByTestId("button-move-machine"));

    await waitFor(() => expect(mockMove).toHaveBeenCalledWith("MBP-000241", { to: "franchise", franchiseId: "fr_northline", expectedVersion: 3 }));
    expect(await screen.findByTestId("owner-moved")).toHaveTextContent("Northline Nutrition, not placed");
    expect(onChanged).toHaveBeenCalled();
  });

  it("says in plain words why a move was refused", async () => {
    mockOwner.mockResolvedValue(ownerReply());
    const message = "That machine is placed at another gym. Move it with PUT /admin/machines/{sn}/owner.";
    mockMove.mockResolvedValue({ ok: false, error: { code: "validation", message, fieldErrors: { sn: message } }, issues: [] });
    render(<MachineOwnerTab machine={machine} onChanged={vi.fn()} />);
    const user = userEvent.setup();

    await user.click(await screen.findByTestId("button-open-move"));
    await user.click(screen.getByTestId("button-move-machine"));

    const panel = await screen.findByTestId("move-machine-error");
    expect(panel).toHaveTextContent("placed at another gym");
    expect(panel).not.toHaveTextContent("PUT");
  });
});
