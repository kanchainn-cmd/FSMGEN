import { renderConditionForDisplay } from "../conditions/renderCondition";
import type { FsmModel } from "../schema/types";

export function generateMermaid(model: FsmModel): string {
  const lines = ["stateDiagram-v2", `  [*] --> ${model.initial}`];

  for (const transition of model.transitions) {
    lines.push(
      `  ${transition.from} --> ${transition.to} : ${sanitizeMermaidLabel(
        renderConditionForDisplay(transition.when),
      )}`,
    );
  }

  return `${lines.join("\n")}\n`;
}

function sanitizeMermaidLabel(label: string): string {
  return label
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\|/g, "\\|")
    .replace(/\[/g, "(")
    .replace(/\]/g, ")")
    .replace(/-->/g, "->")
    .replace(/:/g, "-");
}
