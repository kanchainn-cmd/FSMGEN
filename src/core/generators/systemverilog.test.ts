import { describe, expect, it } from "vitest";
import type { FsmModel } from "../schema/types";
import { generateSystemVerilog } from "./systemverilog";

describe("SystemVerilog FSM generator", () => {
  it("generates ports, enum state logic, Moore outputs, and Mealy overrides", () => {
    const model: FsmModel = {
      version: 1,
      module: "traffic_fsm",
      flavor: "systemverilog",
      mealy: true,
      clock: {
        name: "clk",
        reset: "rst_n",
        reset_active: "low",
      },
      ports: {
        inputs: [
          { name: "timer_done", width: 1 },
          { name: "mode", width: 2 },
        ],
        outputs: [
          { name: "green", width: 1 },
          { name: "yellow", width: 1 },
          { name: "phase", width: 2 },
        ],
      },
      states: [
        { name: "GREEN", outputs: { green: 1, phase: "2'b01" } },
        { name: "YELLOW", outputs: { yellow: 1, phase: "2'b10" } },
      ],
      transitions: [
        {
          from: "GREEN",
          to: "YELLOW",
          when: {
            all: [
              { signal: "timer_done", op: "==", value: 1 },
              { signal: "mode", op: "==", value: "2'b01" },
            ],
          },
          outputs: { yellow: 1 },
        },
      ],
      initial: "GREEN",
    };

    const systemverilog = generateSystemVerilog(model);

    expect(systemverilog).toContain("module traffic_fsm (");
    expect(systemverilog).toContain("input  logic clk");
    expect(systemverilog).toContain("input  logic rst_n");
    expect(systemverilog).toContain("input  logic [1:0] mode");
    expect(systemverilog).toContain("output logic [1:0] phase");
    expect(systemverilog).toContain(
      "typedef enum logic [0:0] { GREEN, YELLOW } state_t;",
    );
    expect(systemverilog).toContain("state_t state, next_state;");
    expect(systemverilog).toContain("always_ff @(posedge clk or negedge rst_n)");
    expect(systemverilog).toContain("if (!rst_n)");
    expect(systemverilog).toContain("always_comb begin");
    expect(systemverilog).toContain("next_state = state;");
    expect(systemverilog).toContain(
      "if ((timer_done == 1) && (mode == 2'b01)) begin",
    );
    expect(systemverilog).toContain("next_state = YELLOW;");
    expect(systemverilog).toContain("green = 1;");
    expect(systemverilog).toContain("phase = 2'b01;");
    expect(systemverilog).toContain("yellow = 0;");
    expect(systemverilog).toContain(
      "if (state == GREEN && ((timer_done == 1) && (mode == 2'b01))) begin",
    );
    expect(systemverilog).toContain("yellow = 1;");
  });

  it("uses a safe one-bit enum and active-high reset for a single-state FSM", () => {
    const model: FsmModel = {
      version: 1,
      module: "single_state_fsm",
      flavor: "systemverilog",
      mealy: false,
      clock: {
        name: "clk",
        reset: "rst",
        reset_active: "high",
      },
      ports: {
        inputs: [],
        outputs: [{ name: "done", width: 1 }],
      },
      states: [{ name: "IDLE", outputs: { done: 1 } }],
      transitions: [],
      initial: "IDLE",
    };

    const systemverilog = generateSystemVerilog(model);

    expect(systemverilog).toContain(
      "typedef enum logic [0:0] { IDLE } state_t;",
    );
    expect(systemverilog).toContain("always_ff @(posedge clk or posedge rst)");
    expect(systemverilog).toContain("if (rst)");
  });
});
