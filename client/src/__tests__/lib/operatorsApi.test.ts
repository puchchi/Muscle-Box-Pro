import { describe, expect, it, vi } from "vitest";

const { apiRequest } = vi.hoisted(() => ({ apiRequest: vi.fn() }));
vi.mock("@/lib/apiClient", () => ({ apiRequest }));

import { setOperatorDisabled } from "@/lib/operatorsApi";

describe("operator paths", () => {
  it("keeps @ and + in the email and still escapes what a path cannot hold", async () => {
    apiRequest.mockResolvedValue({ ok: false, error: { code: "network", message: "x" } });
    await setOperatorDisabled("franchise", "ravi+pune@x.in", true);
    await setOperatorDisabled("admin", "a/b?c@x.in", false);
    expect(apiRequest.mock.calls.map((c) => c[1])).toEqual([
      "/franchise/operators/ravi+pune@x.in/disabled",
      "/admin/operators/a%2Fb%3Fc@x.in/disabled",
    ]);
  });
});
