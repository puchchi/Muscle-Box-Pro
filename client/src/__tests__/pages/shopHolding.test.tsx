import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";

vi.mock("next/image", () => ({ default: ({ alt }: { alt: string }) => <span>{alt}</span> }));
vi.mock("next/link", () => ({
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import { JoinHolding } from "@/pages/shop/JoinHolding";
import { DrinksHolding } from "@/pages/shop/DrinksHolding";
import { readableSn } from "@/pages/shop/ShopHolding";
import { DRINKS_COPY, DRINKS_LIVE_COPY, JOIN_COPY } from "@/pages/shop/shopCopy";

describe("readableSn", () => {
  it("keeps a plain serial number and drops anything else", () => {
    expect(readableSn("GS805TEST01")).toBe("GS805TEST01");
    expect(readableSn(["E01904", "X"])).toBe("E01904");
    expect(readableSn(undefined)).toBeNull();
    expect(readableSn("")).toBeNull();
    expect(readableSn("<script>")).toBeNull();
    expect(readableSn("x".repeat(41))).toBeNull();
  });
});

describe("DrinksHolding", () => {
  it("names the machine, tells the customer to pay on it and links to joining", () => {
    render(<DrinksHolding sn="GS805TEST01" />);
    expect(screen.getByTestId("shop-sn")).toHaveTextContent("Machine GS805TEST01");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Protein shakes on the machine.");
    expect(screen.getAllByRole("list").filter((l) => l.tagName === "OL")).toHaveLength(2);
    expect(screen.queryByTestId("shop-stamp-card")).not.toBeInTheDocument();
    expect(screen.getByTestId("shop-code-card")).toHaveTextContent("type it in");
    expect(screen.getByRole("link", { name: /See how it works/ })).toHaveAttribute("href", "/join?sn=GS805TEST01");
  });

  it("links to joining without an sn when it has none", () => {
    render(<DrinksHolding sn={null} />);
    expect(screen.queryByTestId("shop-sn")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /See how it works/ })).toHaveAttribute("href", "/join");
  });

  it("says phone buying is live when the shop is on, and never calls it coming soon", () => {
    render(<DrinksHolding sn={null} live />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Protein shakes on your phone.");
    expect(document.body).not.toHaveTextContent(/coming soon/i);
  });

  it("uses no em dashes in what the customer reads", () => {
    const copy = JSON.stringify([DRINKS_COPY, DRINKS_LIVE_COPY, JOIN_COPY]);
    expect(copy).not.toContain("—");
  });
});

describe("JoinHolding", () => {
  it("leads with the stamp card, lists what an account gets and says no account is needed to buy", () => {
    render(<JoinHolding sn={null} />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Every 10th protein shake is free.");
    expect(screen.getByTestId("shop-stamp-card")).toHaveTextContent("Stamp card");
    expect(within(screen.getByTestId("join-benefits")).getAllByRole("heading", { level: 3 })).toHaveLength(JOIN_COPY.benefits.length);
    expect(screen.getByRole("heading", { name: /Buy on the machine/ })).toBeInTheDocument();
    expect(screen.getAllByRole("listitem").filter((li) => li.closest("ol"))).toHaveLength(3);
    expect(screen.getByRole("link", { name: /See every protein shake we make/ })).toHaveAttribute("href", "/menu");
    expect(screen.queryByTestId("shop-sn")).not.toBeInTheDocument();
  });

  it("names the machine when it has one", () => {
    render(<JoinHolding sn="GS805TEST01" />);
    expect(screen.getByTestId("shop-sn")).toHaveTextContent("Machine GS805TEST01");
  });
});
