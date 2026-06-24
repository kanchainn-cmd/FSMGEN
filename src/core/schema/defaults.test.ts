import { describe, expect, it } from "vitest";
import { createDefaultModel, normalizeModel } from "./defaults";

describe("FSM schema defaults", () => {
  it("creates a valid Moore SystemVerilog starter model", () => {
    const model = createDefaultModel();

    expect(model.version).toBe(1);
    expect(model.module).toBe("fsm_controller");
    expect(model.flavor).toBe("systemverilog");
    expect(model.mealy).toBe(false);
    expect(model.initial).toBe("IDLE");
    expect(model.states.map((state) => state.name)).toEqual(["IDLE"]);
  });

  it("normalizes missing optional arrays and widths", () => {
    const model = normalizeModel({
      version: 1,
      module: "simple",
      flavor: "verilog2001",
      mealy: false,
      clock: { name: "clk", reset: "rst", reset_active: "high" },
      ports: {
        inputs: [{ name: "go" }],
        outputs: [{ name: "done" }],
      },
      states: [{ name: "IDLE" }],
      initial: "IDLE",
    });

    expect(model.ports.inputs[0].width).toBe(1);
    expect(model.ports.outputs[0].width).toBe(1);
    expect(model.states[0].outputs).toEqual({});
    expect(model.transitions).toEqual([]);
  });
});
