import { renderConditionForDisplay } from "../conditions/renderCondition";
import type { FsmModel, PortConfig } from "../schema/types";

export function generateTestbench(model: FsmModel): string {
  const lines: string[] = [];
  const tbModule = `tb_${model.module}`;

  lines.push("`timescale 1ns/1ps");
  lines.push("");
  lines.push(`module ${tbModule};`);
  lines.push(...renderSignalDeclarations(model));
  lines.push("");
  lines.push("initial begin");
  lines.push(`  ${model.clock.name} = 1'b0;`);
  lines.push("end");
  lines.push("");
  lines.push(`always #5 ${model.clock.name} = ~${model.clock.name};`);
  lines.push("");
  lines.push(`${model.module} dut (`);
  lines.push(...renderDutConnections(model));
  lines.push(");");
  lines.push("");
  lines.push("initial begin");
  lines.push(...renderInputInitialization(model));
  lines.push("");
  lines.push(...renderResetSequence(model));
  lines.push("");
  lines.push("  // Transition-derived stimulus placeholders:");
  for (const transition of model.transitions) {
    lines.push(
      `  // ${transition.from} -> ${transition.to} when ${sanitizeCommentText(
        renderConditionForDisplay(transition.when),
      )}`,
    );
  }
  lines.push("");
  lines.push("  // Add assertions and coverage points here.");
  lines.push("  $finish;");
  lines.push("end");
  lines.push("");
  lines.push("endmodule");

  return `${lines.join("\n")}\n`;
}

function renderSignalDeclarations(model: FsmModel): string[] {
  return [
    `  logic ${model.clock.name};`,
    `  logic ${model.clock.reset};`,
    ...model.ports.inputs.map((port) => `  logic ${renderPackedRange(port)}${port.name};`),
    ...model.ports.outputs.map((port) => `  logic ${renderPackedRange(port)}${port.name};`),
  ];
}

function renderDutConnections(model: FsmModel): string[] {
  const ports = [
    model.clock.name,
    model.clock.reset,
    ...model.ports.inputs.map((port) => port.name),
    ...model.ports.outputs.map((port) => port.name),
  ];

  return ports.map((port, index) => {
    const comma = index === ports.length - 1 ? "" : ",";
    return `  .${port}(${port})${comma}`;
  });
}

function renderInputInitialization(model: FsmModel): string[] {
  return model.ports.inputs.map((port) => `  ${port.name} = 0;`);
}

function renderResetSequence(model: FsmModel): string[] {
  const activeValue = model.clock.reset_active === "low" ? "1'b0" : "1'b1";
  const inactiveValue = model.clock.reset_active === "low" ? "1'b1" : "1'b0";

  return [
    `  ${model.clock.reset} = ${activeValue};`,
    `  repeat (2) @(posedge ${model.clock.name});`,
    `  ${model.clock.reset} = ${inactiveValue};`,
    `  @(posedge ${model.clock.name});`,
  ];
}

function renderPackedRange(port: PortConfig): string {
  return port.width <= 1 ? "" : `[${port.width - 1}:0] `;
}

function sanitizeCommentText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}
