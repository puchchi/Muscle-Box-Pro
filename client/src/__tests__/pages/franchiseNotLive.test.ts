import { describe, it, expect, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: vi.fn(() => ({ replace: vi.fn() })) }));

import { notLiveMessage } from "@/pages/franchise/FranchiseDashboard";

describe("notLiveMessage", () => {
  it("tells a franchise what is left before it goes live", () => {
    expect(notLiveMessage("signed")).toMatch(/first instalment/);
    expect(notLiveMessage("payment_claimed")).toMatch(/checking your transfer/);
    expect(notLiveMessage("payment_verified")).toMatch(/is confirmed/);
    expect(notLiveMessage("approved")).toMatch(/email you/);
  });

  it("uses no em dashes", () => {
    for (const status of ["signed", "payment_claimed", "payment_verified", "approved"] as const) {
      expect(notLiveMessage(status)).not.toContain("—");
    }
  });
});
