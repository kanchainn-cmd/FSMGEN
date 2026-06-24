import { Field } from "../common/Field";
import { renderConditionForDisplay } from "../../core/conditions/renderCondition";
import type {
  AtomicCondition,
  Condition,
  ConditionOperator,
} from "../../core/schema/types";

const conditionOperators: ConditionOperator[] = ["==", "!=", "<", "<=", ">", ">="];
type ConditionMode = "raw" | "atomic" | "all" | "any";

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

function conditionMode(condition: Condition): ConditionMode {
  if ("signal" in condition) {
    return "atomic";
  }

  if ("all" in condition) {
    return "all";
  }

  if ("any" in condition) {
    return "any";
  }

  return "raw";
}

function toAtomic(condition: Condition): AtomicCondition {
  if ("signal" in condition) {
    return condition;
  }

  return { signal: "", op: "==", value: "" };
}

function groupConditions(condition: Condition): Condition[] {
  if ("all" in condition) {
    return condition.all;
  }

  if ("any" in condition) {
    return condition.any;
  }

  return [];
}

function convertCondition(condition: Condition, mode: ConditionMode): Condition {
  if (mode === "raw") {
    return { expr: conditionExpression(condition) };
  }

  if (mode === "atomic") {
    return toAtomic(condition);
  }

  if (mode === "all") {
    return "all" in condition ? condition : { all: [condition] };
  }

  return "any" in condition ? condition : { any: [condition] };
}

function childLabel(parentLabel: string, childIndex: number): string {
  if (parentLabel === "Condition") {
    return `Condition ${childIndex + 1}`;
  }

  return `${parentLabel}.${childIndex + 1}`;
}

export function ConditionEditor({
  condition,
  onChange,
  label = "Condition",
}: {
  condition: Condition;
  onChange: (condition: Condition) => void;
  label?: string;
}) {
  const mode = conditionMode(condition);
  const atomic = toAtomic(condition);
  const children = groupConditions(condition);

  const updateChild = (childIndex: number, childCondition: Condition) => {
    if (mode === "all") {
      onChange({
        all: children.map((child, index) =>
          index === childIndex ? childCondition : child,
        ),
      });
      return;
    }

    if (mode === "any") {
      onChange({
        any: children.map((child, index) =>
          index === childIndex ? childCondition : child,
        ),
      });
    }
  };

  const addChild = () => {
    if (mode === "all") {
      onChange({ all: [...children, { expr: "" }] });
      return;
    }

    if (mode === "any") {
      onChange({ any: [...children, { expr: "" }] });
    }
  };

  return (
    <fieldset>
      <legend>{label}</legend>
      <Field label={`${label} type`}>
        <select
          aria-label={`${label} type`}
          value={mode}
          onChange={(event) => {
            onChange(convertCondition(condition, event.target.value as ConditionMode));
          }}
        >
          <option value="raw">Expression</option>
          <option value="atomic">Atomic</option>
          <option value="all">All</option>
          <option value="any">Any</option>
        </select>
      </Field>
      {mode === "atomic" ? (
        <>
          <Field label={`${label} signal`}>
            <input
              aria-label={`${label} signal`}
              value={atomic.signal}
              onChange={(event) =>
                onChange({ ...atomic, signal: event.target.value })
              }
            />
          </Field>
          <Field label={`${label} operator`}>
            <select
              aria-label={`${label} operator`}
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
          <Field label={`${label} value`}>
            <input
              aria-label={`${label} value`}
              value={String(atomic.value)}
              onChange={(event) =>
                onChange({ ...atomic, value: event.target.value })
              }
            />
          </Field>
        </>
      ) : mode === "all" || mode === "any" ? (
        <>
          {children.map((childCondition, childIndex) => (
            <ConditionEditor
              key={`${label}-${mode}-${childIndex}`}
              condition={childCondition}
              label={childLabel(label, childIndex)}
              onChange={(nextChildCondition) =>
                updateChild(childIndex, nextChildCondition)
              }
            />
          ))}
          <button type="button" onClick={addChild}>
            Add condition to {mode}
          </button>
        </>
      ) : (
        <Field label={`${label} expression`}>
          <input
            aria-label={`${label} expression`}
            value={conditionExpression(condition)}
            onChange={(event) => onChange({ expr: event.target.value })}
          />
        </Field>
      )}
    </fieldset>
  );
}
