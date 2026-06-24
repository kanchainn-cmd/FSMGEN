import { LineCounter, parseDocument, stringify } from "yaml";
import type { YAMLError } from "yaml";
import { normalizeModel } from "../schema/defaults";
import type { FsmModel, FsmModelInput } from "../schema/types";

export interface FsmYamlDiagnostic {
  message: string;
  line?: number;
  column?: number;
}

export type ParseFsmYamlResult =
  | { ok: true; model: FsmModel }
  | { ok: false; diagnostic: FsmYamlDiagnostic };

type StructuralCheckResult = { ok: true } | { ok: false; diagnostic: FsmYamlDiagnostic };

function diagnosticFromYamlError(error: YAMLError, lineCounter: LineCounter): FsmYamlDiagnostic {
  const linePos = error.linePos?.[0] ?? lineCounter.linePos(error.pos[0]);
  const diagnostic: FsmYamlDiagnostic = {
    message: error.message,
  };

  if (linePos.line > 0) {
    diagnostic.line = linePos.line;
    diagnostic.column = linePos.col;
  }

  return diagnostic;
}

function diagnosticFromUnknown(error: unknown): FsmYamlDiagnostic {
  if (error instanceof Error && error.message.length > 0) {
    return { message: error.message };
  }

  return { message: "Unable to parse FSM YAML." };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isScalarOutputValue(value: unknown): value is string | number {
  return typeof value === "string" || typeof value === "number";
}

function ensureNoCycles(value: unknown): StructuralCheckResult {
  const activeObjects = new WeakSet<object>();

  function visit(current: unknown): StructuralCheckResult {
    if (typeof current !== "object" || current === null) {
      return { ok: true };
    }

    if (activeObjects.has(current)) {
      return {
        ok: false,
        diagnostic: { message: "YAML aliases must not create cyclic object graphs." },
      };
    }

    activeObjects.add(current);

    const childValues = Array.isArray(current)
      ? current
      : Object.values(current as Record<string, unknown>);

    for (const child of childValues) {
      const result = visit(child);
      if (!result.ok) {
        return result;
      }
    }

    activeObjects.delete(current);
    return { ok: true };
  }

  return visit(value);
}

function collectionDiagnostic(path: string): StructuralCheckResult {
  return {
    ok: false,
    diagnostic: { message: `${path} must be a sequence.` },
  };
}

function ensureOutputAssignments(value: unknown, path: string): StructuralCheckResult {
  if (value === undefined) {
    return { ok: true };
  }

  if (!isRecord(value)) {
    return {
      ok: false,
      diagnostic: { message: `${path} must be a mapping.` },
    };
  }

  for (const [name, assignment] of Object.entries(value)) {
    if (!isScalarOutputValue(assignment)) {
      return {
        ok: false,
        diagnostic: { message: `${path}.${name} must be a string or number.` },
      };
    }
  }

  return { ok: true };
}

function checkFsmYamlShape(value: unknown): StructuralCheckResult {
  const cycleCheck = ensureNoCycles(value);
  if (!cycleCheck.ok) {
    return cycleCheck;
  }

  if (!isRecord(value)) {
    return {
      ok: false,
      diagnostic: { message: "FSM YAML document must be a top-level mapping." },
    };
  }

  if (!isRecord(value.ports)) {
    return {
      ok: false,
      diagnostic: { message: "ports must be a mapping." },
    };
  }

  if (value.ports.inputs !== undefined && !Array.isArray(value.ports.inputs)) {
    return collectionDiagnostic("ports.inputs");
  }

  if (value.ports.outputs !== undefined && !Array.isArray(value.ports.outputs)) {
    return collectionDiagnostic("ports.outputs");
  }

  const states = value.states;
  if (!Array.isArray(states)) {
    return collectionDiagnostic("states");
  }

  for (const [index, state] of states.entries()) {
    if (!isRecord(state)) {
      return {
        ok: false,
        diagnostic: { message: `states[${index}] must be a mapping.` },
      };
    }

    const assignmentsCheck = ensureOutputAssignments(
      state.outputs,
      `states[${index}].outputs`,
    );
    if (!assignmentsCheck.ok) {
      return assignmentsCheck;
    }
  }

  const transitions = value.transitions;
  if (transitions !== undefined) {
    if (!Array.isArray(transitions)) {
      return collectionDiagnostic("transitions");
    }

    for (const [index, transition] of transitions.entries()) {
      if (!isRecord(transition)) {
        return {
          ok: false,
          diagnostic: { message: `transitions[${index}] must be a mapping.` },
        };
      }

      const assignmentsCheck = ensureOutputAssignments(
        transition.outputs,
        `transitions[${index}].outputs`,
      );
      if (!assignmentsCheck.ok) {
        return assignmentsCheck;
      }
    }
  }

  return { ok: true };
}

export function parseFsmYaml(source: string): ParseFsmYamlResult {
  const lineCounter = new LineCounter();

  try {
    const document = parseDocument(source, { lineCounter });
    const firstError = document.errors[0];

    if (firstError) {
      return {
        ok: false,
        diagnostic: diagnosticFromYamlError(firstError, lineCounter),
      };
    }

    const value = document.toJS();
    const shapeCheck = checkFsmYamlShape(value);
    if (!shapeCheck.ok) {
      return shapeCheck;
    }

    return {
      ok: true,
      model: normalizeModel(value as FsmModelInput),
    };
  } catch (error) {
    return {
      ok: false,
      diagnostic: diagnosticFromUnknown(error),
    };
  }
}

export function serializeFsmYaml(model: FsmModel): string {
  return stringify(normalizeModel(model), {
    aliasDuplicateObjects: false,
  });
}
