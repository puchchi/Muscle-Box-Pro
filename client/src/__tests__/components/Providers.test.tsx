import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Providers from "@/components/Providers";

describe("Providers component", () => {
  it("renders children without crashing", () => {
    render(
      <Providers>
        <div data-testid="child">Hello</div>
      </Providers>
    );
    expect(screen.getByTestId("child")).toBeInTheDocument();
  });

  it("renders child text content", () => {
    render(
      <Providers>
        <span>Test Content</span>
      </Providers>
    );
    expect(screen.getByText("Test Content")).toBeInTheDocument();
  });

  it("renders multiple children", () => {
    render(
      <Providers>
        <div data-testid="a">A</div>
        <div data-testid="b">B</div>
      </Providers>
    );
    expect(screen.getByTestId("a")).toBeInTheDocument();
    expect(screen.getByTestId("b")).toBeInTheDocument();
  });
});
