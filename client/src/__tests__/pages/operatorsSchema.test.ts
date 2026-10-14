import { describe, expect, it } from "vitest";
import { operatorsSchema } from "@shared/admin/operatorsSchema";

const row = { operatorId: "op_pune_01", name: "Ravi", status: "active" };

describe("operator list from the server", () => {
  it("skips a row saved before operators had IDs instead of failing the whole list", () => {
    const parsed = operatorsSchema.safeParse({ operators: [{ name: "Old", email: "old@x.in", status: "active" }, row] });
    expect(parsed.success && parsed.data.operators.map((o) => o.operatorId)).toEqual(["op_pune_01"]);
  });

  it("still refuses a row with an ID that is otherwise malformed", () => {
    expect(operatorsSchema.safeParse({ operators: [{ ...row, status: "paused" }] }).success).toBe(false);
  });
});
