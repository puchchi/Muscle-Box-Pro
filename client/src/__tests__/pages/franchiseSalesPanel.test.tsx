import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { SalesPanel } from "@/pages/franchise/FranchiseDashboard";

const row = (period: string, goodsName: string, drinks: number, amountInr: number) => ({
  period,
  sn: "GS805TEST01",
  deviceExtNo: "MBP-001",
  machineName: "Baner",
  goodsId: goodsName,
  goodsName,
  drinks,
  amountInr,
});

const base = { period: "day" as const, from: "2026-10-01", to: "2026-10-13" };

describe("franchise sales panel", () => {
  it("totals the month, picks out today and names the best seller", () => {
    const rows = [row("2026-10-13", "Whey chocolate", 2, 300), row("2026-10-05", "Whey vanilla", 5, 750), row("2026-10-13", "Whey vanilla", 1, 150)];
    render(<SalesPanel sales={{ ...base, rows, totals: { drinks: 8, amountInr: 1200 } }} />);
    expect(screen.getByTestId("metric-sales-month")).toHaveTextContent("₹1,200");
    expect(screen.getByTestId("metric-sales-month")).toHaveTextContent("8 drinks sold since 01 October 2026");
    expect(screen.getByTestId("metric-sales-today")).toHaveTextContent("₹450");
    expect(screen.getByTestId("metric-sales-today")).toHaveTextContent("3 drinks sold");
    expect(screen.getByTestId("metric-best-seller")).toHaveTextContent("Whey vanilla6 drinks sold");
  });

  it("says so when nothing has sold this month", () => {
    render(<SalesPanel sales={{ ...base, rows: [], totals: { drinks: 0, amountInr: 0 } }} />);
    expect(screen.getByTestId("metric-sales-month")).toHaveTextContent("₹0");
    expect(screen.getByTestId("metric-best-seller")).toHaveTextContent("No sales yet");
  });
});
