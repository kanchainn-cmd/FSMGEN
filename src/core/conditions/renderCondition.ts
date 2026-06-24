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
    assertNonEmptyGroup("all", condition.all);
    return condition.all.map(renderGroupedCondition).join(" && ");
  }

  assertNonEmptyGroup("any", condition.any);
  return condition.any.map(renderGroupedCondition).join(" || ");
}

function renderGroupedCondition(condition: Condition): string {
  return `(${renderCondition(condition)})`;
}

function assertNonEmptyGroup(
  groupName: "all" | "any",
  conditions: Condition[],
): void {
  if (conditions.length === 0) {
    throw new Error(
      `Condition group "${groupName}" must contain at least one child condition.`,
    );
  }
}
