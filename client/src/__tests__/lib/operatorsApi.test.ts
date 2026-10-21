import { beforeEach, describe, expect, it, vi } from "vitest";

const { apiRequest } = vi.hoisted(() => ({ apiRequest: vi.fn() }));
vi.mock("@/lib/apiClient", () => ({ apiRequest }));

import { createOperator, fetchSuggestedOperatorId, setOperatorPassword } from "@/lib/operatorsApi";

const operator = { operatorId: "op_mbp_01", name: "Ravi", status: "active" };

beforeEach(() => apiRequest.mockReset());

describe("operator routes", () => {
  it("asks for a suggested ID, for a franchise when an admin names one", async () => {
    apiRequest.mockResolvedValue({ ok: true, data: { operatorId: "op_pune_03" } });
    expect(await fetchSuggestedOperatorId("admin", "f 1")).toBe("op_pune_03");
    await fetchSuggestedOperatorId("franchise", "f1");
    expect(apiRequest.mock.calls.map((c) => c[1])).toEqual(["/admin/operators/suggested-id?franchiseId=f%201", "/franchise/operators/suggested-id"]);
  });

  it("gives up on the suggestion quietly when the server can't make one", async () => {
    apiRequest.mockResolvedValue({ ok: false, error: { code: "network", message: "x" } });
    expect(await fetchSuggestedOperatorId("franchise", null)).toBeNull();
  });

  it("reads the created operator out of its envelope, with no email", async () => {
    apiRequest.mockResolvedValue({ ok: true, data: { operator } });
    const result = await createOperator("franchise", { operatorId: "op_mbp_01", password: "good-phrase", name: "Ravi", machines: [] });
    expect(result).toMatchObject({ ok: true, data: { operatorId: "op_mbp_01", email: null, phone: null } });
  });

  it("puts the new password to the operator's own path", async () => {
    apiRequest.mockResolvedValue({ ok: true, data: { operator } });
    await setOperatorPassword("admin", "op_mbp_01", "good-phrase");
    expect(apiRequest).toHaveBeenCalledWith("PUT", "/admin/operators/op_mbp_01/password", { api: "franchiseAdmin", body: { password: "good-phrase" } });
  });
});
