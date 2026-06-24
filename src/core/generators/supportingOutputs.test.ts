import { describe, expect, it } from "vitest";
import type { FsmModel } from "../schema/types";
import { generateAllArtifacts } from "./index";
import { generateMermaid } from "./mermaid";
import {
  generateTransitionTableHtml,
  generateTransitionTableMarkdown,
} from "./transitionTable";
import { generateTestbench } from "./testbench";

const mealyModel: FsmModel = {
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
    { name: "RED", outputs: {} },
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
    {
      from: "YELLOW",
      to: "RED",
      when: { expr: "timer_done" },
      outputs: {},
    },
  ],
  initial: "GREEN",
};

describe("supporting FSM artifact generators", () => {
  it("generates a Mermaid state diagram with display-rendered transition labels", () => {
    const mermaid = generateMermaid(mealyModel);

    expect(mermaid).toBe(
      [
        "stateDiagram-v2",
        "  [*] --> GREEN",
        "  GREEN --> YELLOW : (timer_done == 1) && (mode == 2'b01)",
        "  YELLOW --> RED : timer_done",
        "",
      ].join("\n"),
    );
  });

  it("generates Markdown and HTML transition tables including Mealy outputs only for Mealy FSMs", () => {
    const markdown = generateTransitionTableMarkdown(mealyModel);
    const html = generateTransitionTableHtml(mealyModel);

    expect(markdown).toContain(
      "| From | Condition | To | Moore Outputs | Mealy Outputs |",
    );
    expect(markdown).toContain(
      "| GREEN | (timer_done == 1) && (mode == 2'b01) | YELLOW | green=1, phase=2'b01 | yellow=1 |",
    );
    expect(markdown).toContain("| YELLOW | timer_done | RED | yellow=1, phase=2'b10 | - |");

    expect(html).toContain("<table>");
    expect(html).toContain("<th>Mealy Outputs</th>");
    expect(html).toContain(
      "<td>(timer_done == 1) &amp;&amp; (mode == 2&#39;b01)</td>",
    );
    expect(html).toContain("<td>green=1, phase=2&#39;b01</td>");
    expect(html).toContain("<td>yellow=1</td>");

    const mooreModel = { ...mealyModel, mealy: false };

    expect(generateTransitionTableMarkdown(mooreModel)).not.toContain(
      "Mealy Outputs",
    );
    expect(generateTransitionTableHtml(mooreModel)).not.toContain(
      "Mealy Outputs",
    );
  });

  it("keeps raw multiline condition labels on one safe Mermaid transition line", () => {
    const unsafeModel: FsmModel = {
      ...mealyModel,
      transitions: [
        {
          from: "GREEN",
          to: "YELLOW",
          when: {
            expr: "timer_done | mode[0]\nBAD --> HACK : injected",
          },
          outputs: {},
        },
      ],
    };

    const mermaid = generateMermaid(unsafeModel);

    expect(mermaid).toBe(
      [
        "stateDiagram-v2",
        "  [*] --> GREEN",
        "  GREEN --> YELLOW : timer_done \\| mode(0) BAD -> HACK - injected",
        "",
      ].join("\n"),
    );
    expect(
      mermaid.split("\n").filter((line) => line.includes("-->")),
    ).toHaveLength(2);
  });

  it("escapes Markdown table pipes and flattens multiline raw conditions", () => {
    const unsafeModel: FsmModel = {
      ...mealyModel,
      transitions: [
        {
          from: "GREEN",
          to: "YELLOW",
          when: {
            expr: "timer_done | mode[0]\nnext_line",
          },
          outputs: {},
        },
      ],
    };

    const markdown = generateTransitionTableMarkdown(unsafeModel);

    expect(markdown).toContain(
      "| GREEN | timer_done \\| mode[0] next_line | YELLOW | green=1, phase=2'b01 | - |",
    );
    expect(markdown.split("\n")).toHaveLength(4);
  });

  it("keeps transition-derived testbench comments single-line and comment-safe", () => {
    const unsafeModel: FsmModel = {
      ...mealyModel,
      transitions: [
        {
          from: "GREEN",
          to: "YELLOW",
          when: {
            expr: "timer_done\n$finish;\nmode == 2'b01",
          },
          outputs: {},
        },
      ],
    };

    const testbench = generateTestbench(unsafeModel);

    expect(testbench).toContain(
      "// GREEN -> YELLOW when timer_done $finish; mode == 2'b01",
    );
    expect(testbench).not.toContain("\n$finish;\n");
  });

  it("generates a compilable SystemVerilog testbench skeleton", () => {
    const testbench = generateTestbench(mealyModel);

    expect(testbench).toContain("`timescale 1ns/1ps");
    expect(testbench).toContain("module tb_traffic_fsm;");
    expect(testbench).toContain("logic clk;");
    expect(testbench).toContain("logic rst_n;");
    expect(testbench).toContain("logic [1:0] mode;");
    expect(testbench).toContain("always #5 clk = ~clk;");
    expect(testbench).toContain("traffic_fsm dut (");
    expect(testbench).toContain(".clk(clk)");
    expect(testbench).toContain("timer_done = 0;");
    expect(testbench).toContain("rst_n = 1'b0;");
    expect(testbench).toContain("rst_n = 1'b1;");
    expect(testbench).toContain(
      "// GREEN -> YELLOW when (timer_done == 1) && (mode == 2'b01)",
    );
    expect(testbench).toContain("// Add assertions and coverage points here.");
    expect(testbench).toContain("endmodule");
  });

  it("uses active-high reset polarity in generated testbenches", () => {
    const activeHighModel: FsmModel = {
      ...mealyModel,
      clock: {
        name: "clk_i",
        reset: "rst",
        reset_active: "high",
      },
    };

    const testbench = generateTestbench(activeHighModel);

    expect(testbench).toContain("logic clk_i;");
    expect(testbench).toContain("always #5 clk_i = ~clk_i;");
    expect(testbench).toContain("rst = 1'b1;");
    expect(testbench).toContain("repeat (2) @(posedge clk_i);");
    expect(testbench).toContain("rst = 1'b0;");
    expect(testbench).toContain("@(posedge clk_i);");
  });

  it("generates all HDL and companion artifacts with module-derived filenames", () => {
    const artifacts = generateAllArtifacts(mealyModel);

    expect(artifacts.systemverilog.filename).toBe("traffic_fsm.sv");
    expect(artifacts.systemverilog.language).toBe("systemverilog");
    expect(artifacts.verilog2001.filename).toBe("traffic_fsm.v");
    expect(artifacts.verilog2001.language).toBe("verilog");
    expect(artifacts.mermaid.filename).toBe("traffic_fsm.mmd");
    expect(artifacts.mermaid.language).toBe("mermaid");
    expect(artifacts.transitionTable.filename).toBe("traffic_fsm_transitions.md");
    expect(artifacts.transitionTable.language).toBe("markdown");
    expect(artifacts.testbench.filename).toBe("tb_traffic_fsm.sv");
    expect(artifacts.testbench.language).toBe("systemverilog");
    expect(artifacts.systemverilog.content).toContain("module traffic_fsm (");
    expect(artifacts.verilog2001.content).toContain("module traffic_fsm (");
    expect(artifacts.mermaid.content).toContain("stateDiagram-v2");
    expect(artifacts.transitionTable.content).toContain("| From | Condition | To |");
    expect(artifacts.testbench.content).toContain("module tb_traffic_fsm;");
  });
});
