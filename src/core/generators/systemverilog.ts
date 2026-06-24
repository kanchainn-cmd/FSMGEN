import { renderConditionForVerilog } from "../conditions/renderCondition";
import type { FsmModel, PortConfig, TransitionConfig } from "../schema/types";

export function generateSystemVerilog(model: FsmModel): string {
  const lines: string[] = [];

  lines.push(`module ${model.module} (`);
  lines.push(...renderPorts(model));
  lines.push(");");
  lines.push("");
  lines.push(renderStateTypedef(model));
  lines.push("state_t state, next_state;");
  lines.push("");
  lines.push(...renderStateRegister(model));
  lines.push("");
  lines.push(...renderNextStateLogic(model));
  lines.push("");
  lines.push(...renderOutputLogic(model));
  lines.push("");
  lines.push("endmodule");

  return `${lines.join("\n")}\n`;
}

function renderPorts(model: FsmModel): string[] {
  const ports = [
    `input  logic ${model.clock.name}`,
    `input  logic ${model.clock.reset}`,
    ...model.ports.inputs.map((port) => renderPort("input ", port)),
    ...model.ports.outputs.map((port) => renderPort("output", port)),
  ];

  return ports.map((port, index) => {
    const comma = index === ports.length - 1 ? "" : ",";
    return `  ${port}${comma}`;
  });
}

function renderPort(direction: "input " | "output", port: PortConfig): string {
  return `${direction} logic ${renderPackedRange(port.width)}${port.name}`;
}

function renderPackedRange(width: number): string {
  return width <= 1 ? "" : `[${width - 1}:0] `;
}

function renderStateTypedef(model: FsmModel): string {
  const width = Math.max(1, Math.ceil(Math.log2(model.states.length)));
  const stateNames = model.states.map((state) => state.name).join(", ");

  return `typedef enum logic [${width - 1}:0] { ${stateNames} } state_t;`;
}

function renderStateRegister(model: FsmModel): string[] {
  const resetEdge = model.clock.reset_active === "low" ? "negedge" : "posedge";
  const resetCondition =
    model.clock.reset_active === "low"
      ? `!${model.clock.reset}`
      : model.clock.reset;

  return [
    `always_ff @(posedge ${model.clock.name} or ${resetEdge} ${model.clock.reset}) begin`,
    `  if (${resetCondition}) begin`,
    `    state <= ${model.initial};`,
    "  end else begin",
    "    state <= next_state;",
    "  end",
    "end",
  ];
}

function renderNextStateLogic(model: FsmModel): string[] {
  const lines = [
    "always_comb begin",
    "  next_state = state;",
    "",
    "  case (state)",
  ];

  for (const state of model.states) {
    lines.push(`    ${state.name}: begin`);

    for (const transition of transitionsFrom(model, state.name)) {
      lines.push(
        `      if (${renderConditionForVerilog(transition.when)}) begin`,
      );
      lines.push(`        next_state = ${transition.to};`);
      lines.push("      end");
    }

    lines.push("    end");
  }

  lines.push("    default: begin");
  lines.push(`      next_state = ${model.initial};`);
  lines.push("    end");
  lines.push("  endcase");
  lines.push("end");

  return lines;
}

function renderOutputLogic(model: FsmModel): string[] {
  const lines = [
    "always_comb begin",
    ...model.ports.outputs.map((output) => `  ${output.name} = 0;`),
    "",
    "  case (state)",
  ];

  for (const state of model.states) {
    lines.push(`    ${state.name}: begin`);

    for (const [outputName, value] of Object.entries(state.outputs)) {
      lines.push(`      ${outputName} = ${value};`);
    }

    lines.push("    end");
  }

  lines.push("    default: begin");
  lines.push("    end");
  lines.push("  endcase");

  if (model.mealy) {
    const transitionsWithOutputs = model.transitions.filter(
      (transition) => Object.keys(transition.outputs).length > 0,
    );

    if (transitionsWithOutputs.length > 0) {
      lines.push("");

      for (const transition of transitionsWithOutputs) {
        lines.push(
          `  if (state == ${transition.from} && (${renderConditionForVerilog(
            transition.when,
          )})) begin`,
        );

        for (const [outputName, value] of Object.entries(transition.outputs)) {
          lines.push(`    ${outputName} = ${value};`);
        }

        lines.push("  end");
      }
    }
  }

  lines.push("end");

  return lines;
}

function transitionsFrom(model: FsmModel, stateName: string): TransitionConfig[] {
  return model.transitions.filter((transition) => transition.from === stateName);
}
