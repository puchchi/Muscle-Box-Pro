import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MachinesMetric } from "@/pages/franchise/FranchiseDashboard";

const fleet = { machines: 1, online: 0, offline: 1, faulty: 0, lowStock: 1, restartPending: 0 };

describe("franchise dashboard machines figure", () => {
  it("counts the machines the console counts, beside what the agreement has", () => {
    render(<MachinesMetric allocation={5} fleet={fleet} />);
    const card = screen.getByTestId("metric-machines");
    expect(card).toHaveTextContent("Your machines");
    expect(card).toHaveTextContent("1");
    expect(card).toHaveTextContent("0 online now. Your agreement has 5.");
    expect(card).toHaveAttribute("href", "/machines");
  });

  it("falls back to the agreement when the console can't be read", () => {
    render(<MachinesMetric allocation={5} fleet={null} />);
    const card = screen.getByTestId("metric-machines");
    expect(card).toHaveTextContent("Machines allocated");
    expect(card).not.toHaveAttribute("href");
  });
});
