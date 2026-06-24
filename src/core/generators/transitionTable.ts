import { renderConditionForDisplay } from "../conditions/renderCondition";
import type { FsmModel, StateConfig, TransitionConfig } from "../schema/types";

interface TransitionTableRow {
  from: string;
  condition: string;
  to: string;
  mooreOutputs: string;
  mealyOutputs: string;
}

export function generateTransitionTableMarkdown(model: FsmModel): string {
  const headers = transitionTableHeaders(model);
  const rows = transitionTableRows(model);
  const lines = [
    markdownRow(headers),
    markdownRow(headers.map(() => "---")),
    ...rows.map((row) =>
      markdownRow([
        row.from,
        row.condition,
        row.to,
        row.mooreOutputs,
        ...(model.mealy ? [row.mealyOutputs] : []),
      ]),
    ),
  ];

  return `${lines.join("\n")}\n`;
}

export function generateTransitionTableHtml(model: FsmModel): string {
  const headers = transitionTableHeaders(model);
  const rows = transitionTableRows(model);
  const lines = [
    "<table>",
    "  <thead>",
    `    <tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr>`,
    "  </thead>",
    "  <tbody>",
  ];

  for (const row of rows) {
    const cells = [
      row.from,
      row.condition,
      row.to,
      row.mooreOutputs,
      ...(model.mealy ? [row.mealyOutputs] : []),
    ];

    lines.push(
      `    <tr>${cells.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`,
    );
  }

  lines.push("  </tbody>", "</table>");

  return `${lines.join("\n")}\n`;
}

function transitionTableHeaders(model: FsmModel): string[] {
  return [
    "From",
    "Condition",
    "To",
    "Moore Outputs",
    ...(model.mealy ? ["Mealy Outputs"] : []),
  ];
}

function transitionTableRows(model: FsmModel): TransitionTableRow[] {
  return model.transitions.map((transition) => {
    const fromState = model.states.find(
      (state) => state.name === transition.from,
    );

    return {
      from: transition.from,
      condition: renderConditionForDisplay(transition.when),
      to: transition.to,
      mooreOutputs: renderOutputs(fromState?.outputs ?? {}),
      mealyOutputs: renderOutputs(transition.outputs),
    };
  });
}

function markdownRow(cells: string[]): string {
  return `| ${cells.map(escapeMarkdownCell).join(" | ")} |`;
}

function escapeMarkdownCell(cell: string): string {
  return cell.replace(/\|/g, "\\|");
}

function renderOutputs(outputs: StateConfig["outputs"] | TransitionConfig["outputs"]): string {
  const entries = Object.entries(outputs);

  if (entries.length === 0) {
    return "-";
  }

  return entries.map(([name, value]) => `${name}=${value}`).join(", ");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
