import { Field } from "../common/Field";
import { renderConditionForDisplay } from "../../core/conditions/renderCondition";
import type {
  AtomicCondition,
  Condition,
  ConditionOperator,
} from "../../core/schema/types";

const conditionOperators: ConditionOperator[] = ["==", "!=", "<", "<=", ">", ">="];

function conditionExpression(condition: Condition): string {
  if ("expr" in condition) {
    return condition.expr;
  }

  if ("signal" in condition) {
    return `${condition.signal} ${condition.op} ${condition.value}`;
  }

  try {
    return renderConditionForDisplay(condition);
  } catch {
    return "";
  }
}

function conditionMode(condition: Condition): "raw" | "atomic" {
  return "signal" in condition ? "atomic" : "raw";
}

function toAtomic(condition: Condition): AtomicCondition {
  if ("signal" in condition) {
    return condition;
  }

  return { signal: "", op: "==", value: "" };
}

export function ConditionEditor({
  condition,
  onChange,
}: {
  condition: Condition;
  onChange: (condition: Condition) => void;
}) {
  const mode = conditionMode(condition);
  const atomic = toAtomic(condition);

  return (
    <fieldset>
      <legend>Condition</legend>
      <Field label="Condition type">
        <select
          aria-label="Condition type"
          value={mode}
          onChange={(event) => {
            if (event.target.value === "atomic") {
              onChange(toAtomic(condition));
              return;
            }

            onChange({ expr: conditionExpression(condition) });
          }}
        >
          <option value="raw">Expression</option>
          <option value="atomic">Atomic</option>
        </select>
      </Field>
      {mode === "atomic" ? (
        <>
          <Field label="Condition signal">
            <input
              aria-label="Condition signal"
              value={atomic.signal}
              onChange={(event) =>
                onChange({ ...atomic, signal: event.target.value })
              }
            />
          </Field>
          <Field label="Condition operator">
            <select
              aria-label="Condition operator"
              value={atomic.op}
              onChange={(event) =>
                onChange({ ...atomic, op: event.target.value as ConditionOperator })
              }
            >
              {conditionOperators.map((operator) => (
                <option key={operator} value={operator}>
                  {operator}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Condition value">
            <input
              aria-label="Condition value"
              value={String(atomic.value)}
              onChange={(event) =>
                onChange({ ...atomic, value: event.target.value })
              }
            />
          </Field>
        </>
      ) : (
        <Field label="Condition expression">
          <input
            aria-label="Condition expression"
            value={conditionExpression(condition)}
            onChange={(event) => onChange({ expr: event.target.value })}
          />
        </Field>
      )}
    </fieldset>
  );
}
