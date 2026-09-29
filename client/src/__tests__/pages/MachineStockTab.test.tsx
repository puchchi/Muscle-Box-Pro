import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { mockFetchStock, mockRestock, mockHistory } = vi.hoisted(() => ({
  mockFetchStock: vi.fn(),
  mockRestock: vi.fn(),
  mockHistory: vi.fn(),
}));
vi.mock("@/lib/adminMachineApi", () => ({
  fetchStock: mockFetchStock,
  restock: mockRestock,
  fetchRestockHistory: mockHistory,
}));

import { MachineStockTab } from "@/pages/admin/machines/MachineStockTab";

const slot = {
  slotId: "s1",
  materialId: "m1",
  name: "Whey",
  position: "1",
  rawType: "powder",
  unit: "g",
  capacity: 1000,
  warnCapacity: 100,
  residueQty: 400,
  low: false,
};

const stock = (residueQty: number) => ({ ok: true, data: { items: [{ ...slot, residueQty }] } });

beforeEach(() => {
  mockFetchStock.mockReset();
  mockRestock.mockReset();
});

describe("MachineStockTab", () => {
  it("fills to capacity and shows the new level", async () => {
    mockFetchStock.mockResolvedValue(stock(400));
    render(<MachineStockTab sn="SN01" />);
    await screen.findByTestId("row-slot-s1");
    await userEvent.click(screen.getByTestId("button-fill-100"));
    expect(screen.getByTestId("add-s1")).toHaveValue("600");
    expect(screen.getByTestId("new-level-s1")).toHaveTextContent("New level: 1000");
  });

  it("on stale stock, shows the message, reloads levels and keeps what was typed", async () => {
    mockFetchStock.mockResolvedValueOnce(stock(400)).mockResolvedValueOnce(stock(250));
    mockRestock.mockResolvedValue({
      ok: false,
      error: { code: "stale_stock", message: "Stock changed on the machine (a restock or a drink) since you opened this." },
      issues: [],
    });
    render(<MachineStockTab sn="SN01" />);
    await screen.findByTestId("row-slot-s1");
    await userEvent.type(screen.getByTestId("add-s1"), "500");
    await userEvent.click(screen.getByTestId("button-submit-stock"));

    expect(mockRestock).toHaveBeenCalledWith("SN01", [{ slotId: "s1", add: 500, seenResidueQty: 400 }]);
    expect(await screen.findByTestId("stock-error")).toHaveTextContent("Stock changed on the machine");
    await waitFor(() => expect(screen.getByTestId("current-s1")).toHaveTextContent("250"));
    expect(screen.getByTestId("add-s1")).toHaveValue("500");
    expect(screen.getByTestId("new-level-s1")).toHaveTextContent("New level: 750");
  });

  it("asks for an amount before submitting nothing", async () => {
    mockFetchStock.mockResolvedValue(stock(400));
    render(<MachineStockTab sn="SN01" />);
    await screen.findByTestId("row-slot-s1");
    await userEvent.click(screen.getByTestId("button-submit-stock"));
    expect(mockRestock).not.toHaveBeenCalled();
    expect(screen.getByTestId("stock-error")).toHaveTextContent("Enter an amount");
  });
});
