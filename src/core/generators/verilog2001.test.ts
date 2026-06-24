import { describe, expect, it } from "vitest";
import type { FsmModel } from "../schema/types";
import { generateVerilog2001 } from "./verilog2001";

describe("Verilog-2001 FSM generator", () => {
  it("generates ports, localparam state logic, Moore outputs, and Mealy overrides", () => {
    const model: FsmModel = {
      version: 1,
      module: "traffic_fsm",
      flavor: "verilog2001",
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

    const verilog = generateVerilog2001(model);

    expect(verilog).toContain("module traffic_fsm (");
    expect(verilog).toContain("input clk");
    expect(verilog).toContain("input rst_n");
    expect(verilog).toContain("input [1:0] mode");
    expect(verilog).toContain("output reg [1:0] phase");
    expect(verilog).toContain("localparam [0:0] GREEN = 1'd0;");
    expect(verilog).toContain("localparam [0:0] YELLOW = 1'd1;");
    expect(verilog).toContain("reg [0:0] state, next_state;");
    expect(verilog).toContain("always @(posedge clk or negedge rst_n)");
    expect(verilog).toContain("if (!rst_n)");
    expect(verilog).toContain("always @(*) begin");
    expect(verilog).toContain("next_state = state;");
    expect(verilog).toContain("green = 0;");
    expect(verilog).toContain("yellow = 0;");
    expect(verilog).toContain("phase = 0;");
    expect(verilog).toContain(
      "if ((timer_done == 1) && (mode == 2'b01)) begin",
    );
    expect(verilog).toContain("next_state = YELLOW;");
    expect(verilog).toContain("green = 1;");
    expect(verilog).toContain("phase = 2'b01;");
    expect(verilog).toContain(
      "if (state == GREEN && ((timer_done == 1) && (mode == 2'b01))) begin",
    );
    expect(verilog).toContain("yellow = 1;");
  });

  it("uses a safe one-bit encoding and active-high reset for a single-state FSM", () => {
    const model: FsmModel = {
      version: 1,
      module: "single_state_fsm",
      flavor: "verilog2001",
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

    const verilog = generateVerilog2001(model);

    expect(verilog).toContain("localparam [0:0] IDLE = 1'd0;");
    expect(verilog).toContain("reg [0:0] state, next_state;");
    expect(verilog).toContain("always @(posedge clk or posedge rst)");
    expect(verilog).toContain("if (rst)");
  });
});
