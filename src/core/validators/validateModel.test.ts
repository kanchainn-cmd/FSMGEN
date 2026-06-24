import { describe, expect, it } from "vitest";
import { createDefaultModel } from "../schema/defaults";
import type { FsmModel } from "../schema/types";
import { validateModel } from "./validateModel";

function messages(result: { errors: string[]; warnings: string[] }): string[] {
  return [...result.errors, ...result.warnings];
}

describe("FSM model validator", () => {
  it("accepts the default model", () => {
    expect(validateModel(createDefaultModel()).valid).toBe(true);
  });

  it("rejects an initial state that is not declared", () => {
    const model = { ...createDefaultModel(), initial: "MISSING" };

    const result = validateModel(model);

    expect(result.valid).toBe(false);
    expect(result.errors.some((message) => message.includes("Initial state"))).toBe(
      true,
    );
  });

  it("rejects transition targets that are not declared", () => {
    const model: FsmModel = {
      ...createDefaultModel(),
      transitions: [
        {
          from: "IDLE",
          to: "DONE",
          when: { expr: "start" },
          outputs: {},
        },
      ],
    };

    const result = validateModel(model);

    expect(result.valid).toBe(false);
    expect(result.errors.some((message) => message.includes("DONE"))).toBe(true);
  });

  it("rejects Mealy transition outputs when Mealy mode is disabled", () => {
    const model: FsmModel = {
      ...createDefaultModel(),
      mealy: false,
      transitions: [
        {
          from: "IDLE",
          to: "IDLE",
          when: { expr: "start" },
          outputs: { done: 1 },
        },
      ],
    };

    const result = validateModel(model);

    expect(result.valid).toBe(false);
    expect(result.errors.some((message) => message.includes("Mealy"))).toBe(true);
  });

  it("validates HDL-like identifiers for model names and condition signals", () => {
    const model: FsmModel = {
      ...createDefaultModel(),
      module: "1bad",
      clock: { ...createDefaultModel().clock, name: "clk-main", reset: "rst n" },
      ports: {
        inputs: [{ name: "go-now", width: 1 }],
        outputs: [{ name: "done", width: 1 }],
      },
      states: [{ name: "WAIT STATE", outputs: { done: 0 } }],
      initial: "WAIT STATE",
      transitions: [
        {
          from: "WAIT STATE",
          to: "WAIT STATE",
          when: { signal: "bad-signal", op: "==", value: 1 },
          outputs: {},
        },
      ],
    };

    const result = validateModel(model);

    expect(result.valid).toBe(false);
    expect(messages(result)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("module"),
        expect.stringContaining("clock"),
        expect.stringContaining("reset"),
        expect.stringContaining("input"),
        expect.stringContaining("state"),
        expect.stringContaining("condition signal"),
      ]),
    );
  });

  it("detects duplicate state, input, and output names", () => {
    const model: FsmModel = {
      ...createDefaultModel(),
      ports: {
        inputs: [
          { name: "start", width: 1 },
          { name: "start", width: 1 },
        ],
        outputs: [
          { name: "done", width: 1 },
          { name: "done", width: 1 },
        ],
      },
      states: [
        { name: "IDLE", outputs: { done: 0 } },
        { name: "IDLE", outputs: { done: 1 } },
      ],
    };

    const result = validateModel(model);

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Duplicate state name "IDLE"'),
        expect.stringContaining('Duplicate input name "start"'),
        expect.stringContaining('Duplicate output name "done"'),
      ]),
    );
  });

  it("rejects input and output port widths below 1 or non-integer", () => {
    const model: FsmModel = {
      ...createDefaultModel(),
      ports: {
        inputs: [
          { name: "zero_width", width: 0 },
          { name: "fractional_width", width: 1.5 },
        ],
        outputs: [{ name: "negative_width", width: -1 }],
      },
      states: [{ name: "IDLE", outputs: { negative_width: 0 } }],
    };

    const result = validateModel(model);

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining('input "zero_width" width'),
        expect.stringContaining('input "fractional_width" width'),
        expect.stringContaining('output "negative_width" width'),
      ]),
    );
  });

  it("rejects Moore and Mealy output assignments to undeclared output ports", () => {
    const model: FsmModel = {
      ...createDefaultModel(),
      mealy: true,
      states: [{ name: "IDLE", outputs: { missing_moore: 1 } }],
      transitions: [
        {
          from: "IDLE",
          to: "IDLE",
          when: { expr: "start" },
          outputs: { missing_mealy: 1 },
        },
      ],
    };

    const result = validateModel(model);

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining("missing_moore"),
        expect.stringContaining("missing_mealy"),
      ]),
    );
  });

  it("warns when structured condition signals are not declared model signals", () => {
    const model: FsmModel = {
      ...createDefaultModel(),
      transitions: [
        {
          from: "IDLE",
          to: "IDLE",
          when: { signal: "unknown_signal", op: "==", value: 1 },
          outputs: {},
        },
      ],
    };

    const result = validateModel(model);

    expect(result.valid).toBe(true);
    expect(result.warnings).toEqual([expect.stringContaining("unknown_signal")]);
  });

  it("rejects unsupported HDL flavor values from runtime input", () => {
    const model: FsmModel = {
      ...createDefaultModel(),
      flavor: "vhdl" as FsmModel["flavor"],
    };

    const result = validateModel(model);

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual([expect.stringContaining("flavor")]);
  });

  it("rejects unsupported reset polarity values from runtime input", () => {
    const model: FsmModel = {
      ...createDefaultModel(),
      clock: {
        ...createDefaultModel().clock,
        reset_active: "negative" as FsmModel["clock"]["reset_active"],
      },
    };

    const result = validateModel(model);

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual([expect.stringContaining("reset_active")]);
  });

  it("rejects unsupported structured condition operator values from runtime input", () => {
    const model: FsmModel = {
      ...createDefaultModel(),
      transitions: [
        {
          from: "IDLE",
          to: "IDLE",
          when: {
            signal: "start",
            op: "===",
            value: 1,
          } as unknown as FsmModel["transitions"][number]["when"],
          outputs: {},
        },
      ],
    };

    const result = validateModel(model);

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual([expect.stringContaining("operator")]);
  });

  it("validates raw expressions and condition groups are non-empty", () => {
    const model: FsmModel = {
      ...createDefaultModel(),
      transitions: [
        {
          from: "IDLE",
          to: "IDLE",
          when: { expr: "   " },
          outputs: {},
        },
        {
          from: "IDLE",
          to: "IDLE",
          when: { all: [] },
          outputs: {},
        },
        {
          from: "IDLE",
          to: "IDLE",
          when: { any: [] },
          outputs: {},
        },
      ],
    };

    const result = validateModel(model);

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining("raw expression"),
        expect.stringContaining("all"),
        expect.stringContaining("any"),
      ]),
    );
  });

  it("returns validation errors instead of throwing for unknown condition shapes", () => {
    const model: FsmModel = {
      ...createDefaultModel(),
      transitions: [
        {
          from: "IDLE",
          to: "IDLE",
          when: {} as FsmModel["transitions"][number]["when"],
          outputs: {},
        },
      ],
    };

    const result = validateModel(model);

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual([
      expect.stringContaining("condition shape"),
    ]);
  });

  it("returns validation errors instead of throwing for non-array all groups", () => {
    const model: FsmModel = {
      ...createDefaultModel(),
      transitions: [
        {
          from: "IDLE",
          to: "IDLE",
          when: {
            all: "start",
          } as unknown as FsmModel["transitions"][number]["when"],
          outputs: {},
        },
      ],
    };

    const result = validateModel(model);

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual([expect.stringContaining("all")]);
  });

  it("returns validation errors instead of throwing for non-array any groups", () => {
    const model: FsmModel = {
      ...createDefaultModel(),
      transitions: [
        {
          from: "IDLE",
          to: "IDLE",
          when: {
            any: "start",
          } as unknown as FsmModel["transitions"][number]["when"],
          outputs: {},
        },
      ],
    };

    const result = validateModel(model);

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual([expect.stringContaining("any")]);
  });

  it("rejects clock and reset names that collide", () => {
    const model: FsmModel = {
      ...createDefaultModel(),
      clock: { ...createDefaultModel().clock, reset: "clk" },
    };

    const result = validateModel(model);

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual([
      expect.stringContaining('Clock/reset name "clk"'),
    ]);
  });

  it("rejects input and output names that collide", () => {
    const model: FsmModel = {
      ...createDefaultModel(),
      ports: {
        inputs: [{ name: "shared", width: 1 }],
        outputs: [{ name: "shared", width: 1 }],
      },
      states: [{ name: "IDLE", outputs: { shared: 0 } }],
    };

    const result = validateModel(model);

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual([
      expect.stringContaining('Port name "shared"'),
    ]);
  });

  it("rejects state names that collide with ports, clock, or reset", () => {
    const model: FsmModel = {
      ...createDefaultModel(),
      states: [
        { name: "clk", outputs: { done: 0 } },
        { name: "start", outputs: { done: 0 } },
        { name: "done", outputs: { done: 0 } },
        { name: "rst_n", outputs: { done: 0 } },
      ],
      initial: "clk",
    };

    const result = validateModel(model);

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining('State name "clk"'),
        expect.stringContaining('State name "start"'),
        expect.stringContaining('State name "done"'),
        expect.stringContaining('State name "rst_n"'),
      ]),
    );
  });
});
