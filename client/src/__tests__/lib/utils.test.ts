import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";

describe("cn()", () => {
  it("returns a single class unchanged", () => {
    expect(cn("text-red-500")).toBe("text-red-500");
  });

  it("joins multiple classes", () => {
    expect(cn("px-4", "py-2", "text-white")).toBe("px-4 py-2 text-white");
  });

  it("filters out falsy values", () => {
    expect(cn("px-4", false, null, undefined, "text-white")).toBe(
      "px-4 text-white"
    );
  });

  it("handles conditional object syntax from clsx", () => {
    expect(cn({ "bg-primary": true, "bg-red-500": false })).toBe("bg-primary");
  });

  it("resolves conflicting Tailwind classes — last wins", () => {
    expect(cn("px-4", "px-8")).toBe("px-8");
    expect(cn("text-sm", "text-lg")).toBe("text-lg");
    expect(cn("bg-red-500", "bg-blue-500")).toBe("bg-blue-500");
  });

  it("handles array syntax from clsx", () => {
    expect(cn(["px-4", "py-2"])).toBe("px-4 py-2");
  });

  it("handles nested arrays", () => {
    expect(cn(["px-4", ["py-2", "text-white"]])).toBe("px-4 py-2 text-white");
  });

  it("returns empty string when no arguments given", () => {
    expect(cn()).toBe("");
  });

  it("merges Tailwind modifiers correctly", () => {
    expect(cn("hover:bg-red-500", "hover:bg-blue-500")).toBe(
      "hover:bg-blue-500"
    );
  });

  it("combines conditional classes with static classes", () => {
    const isActive = true;
    expect(cn("base-class", isActive && "active-class")).toBe(
      "base-class active-class"
    );
  });
});
