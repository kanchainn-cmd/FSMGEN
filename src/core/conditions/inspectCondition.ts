import type { AtomicCondition, Condition } from "../schema/types";

export function collectConditionSignals(condition: Condition): AtomicCondition[] {
  if ("expr" in condition) {
    return [];
  }

  if ("signal" in condition) {
    return [condition];
  }

  if ("all" in condition) {
    return condition.all.flatMap(collectConditionSignals);
  }

  return condition.any.flatMap(collectConditionSignals);
}
