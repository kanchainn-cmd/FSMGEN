import type { Condition } from "../schema/types";

export function renderConditionForVerilog(condition: Condition): string {
  return renderCondition(condition);
}

export function renderConditionForDisplay(condition: Condition): string {
  return renderCondition(condition);
}

function renderCondition(condition: Condition): string {
  if ("expr" in condition) {
    return condition.expr;
  }

  if ("signal" in condition) {
    return `${condition.signal} ${condition.op} ${condition.value}`;
  }

  if ("all" in condition) {
    return condition.all.map(renderGroupedCondition).join(" && ");
  }

  return condition.any.map(renderGroupedCondition).join(" || ");
}

function renderGroupedCondition(condition: Condition): string {
  return `(${renderCondition(condition)})`;
}
