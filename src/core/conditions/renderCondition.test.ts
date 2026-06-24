import { describe, expect, it } from "vitest";
import { renderConditionForDisplay, renderConditionForVerilog } from "./renderCondition";

describe("condition rendering", () => {
  it("renders raw expressions for Verilog unchanged", () => {
    expect(renderConditionForVerilog({ expr: "start && ready" })).toBe(
      "start && ready",
    );
  });

  it("renders nested structured conditions for Verilog", () => {
    expect(
      renderConditionForVerilog({
        all: [
          { signal: "start", op: "==", value: 1 },
          {
            any: [
              { signal: "mode", op: "==", value: "2'b01" },
              { signal: "force", op: "==", value: 1 },
            ],
          },
        ],
      }),
    ).toBe("(start == 1) && ((mode == 2'b01) || (force == 1))");
  });

  it("renders atomic conditions for display", () => {
    expect(
      renderConditionForDisplay({ signal: "done", op: "==", value: 1 }),
    ).toBe("done == 1");
  });
});
