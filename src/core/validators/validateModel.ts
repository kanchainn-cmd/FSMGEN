import type { FsmModel } from "../schema/types";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

const HDL_IDENTIFIER_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

export function validateModel(model: FsmModel): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  validateIdentifier("module", model.module, errors);
  validateIdentifier("clock", model.clock.name, errors);
  validateIdentifier("reset", model.clock.reset, errors);

  validateNamedItems(
    "input",
    model.ports.inputs.map((input) => input.name),
    errors,
  );
  validateNamedItems(
    "output",
    model.ports.outputs.map((output) => output.name),
    errors,
  );
  validatePortWidths("input", model.ports.inputs, errors);
  validatePortWidths("output", model.ports.outputs, errors);
  validateNamedItems(
    "state",
    model.states.map((state) => state.name),
    errors,
  );
  validateSharedNameConflicts(model, errors);

  const stateNames = new Set(model.states.map((state) => state.name));
  const outputNames = new Set(model.ports.outputs.map((output) => output.name));
  const declaredSignals = new Set([
    model.clock.name,
    model.clock.reset,
    ...model.ports.inputs.map((input) => input.name),
    ...model.ports.outputs.map((output) => output.name),
  ]);

  if (!stateNames.has(model.initial)) {
    errors.push(`Initial state "${model.initial}" is not declared.`);
  }

  for (const state of model.states) {
    for (const outputName of Object.keys(state.outputs)) {
      if (!outputNames.has(outputName)) {
        errors.push(
          `State "${state.name}" assigns undeclared output port "${outputName}".`,
        );
      }
    }
  }

  model.transitions.forEach((transition, index) => {
    if (!stateNames.has(transition.from)) {
      errors.push(
        `Transition ${index} references undeclared source state "${transition.from}".`,
      );
    }

    if (!stateNames.has(transition.to)) {
      errors.push(
        `Transition ${index} references undeclared target state "${transition.to}".`,
      );
    }

    const transitionOutputNames = Object.keys(transition.outputs);
    if (!model.mealy && transitionOutputNames.length > 0) {
      errors.push(
        `Mealy transition outputs are not allowed when mealy is false.`,
      );
    }

    for (const outputName of transitionOutputNames) {
      if (!outputNames.has(outputName)) {
        errors.push(
          `Transition ${index} assigns undeclared output port "${outputName}".`,
        );
      }
    }

    validateCondition(
      transition.when,
      `transitions[${index}].when`,
      errors,
      warnings,
      declaredSignals,
    );
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

function validateNamedItems(
  kind: "input" | "output" | "state",
  names: string[],
  errors: string[],
): void {
  const seen = new Set<string>();

  for (const name of names) {
    validateIdentifier(kind, name, errors);

    if (seen.has(name)) {
      errors.push(`Duplicate ${kind} name "${name}".`);
    }

    seen.add(name);
  }
}

function validateIdentifier(label: string, value: string, errors: string[]): void {
  if (!HDL_IDENTIFIER_PATTERN.test(value)) {
    errors.push(`${label} "${value}" must be a legal HDL-like identifier.`);
  }
}

function validatePortWidths(
  kind: "input" | "output",
  ports: Array<{ name: string; width: number }>,
  errors: string[],
): void {
  for (const port of ports) {
    if (!Number.isInteger(port.width) || port.width < 1) {
      errors.push(
        `${kind} "${port.name}" width must be an integer greater than or equal to 1.`,
      );
    }
  }
}

function validateCondition(
  condition: unknown,
  path: string,
  errors: string[],
  warnings: string[],
  declaredSignals: Set<string>,
): void {
  if (!isRecord(condition)) {
    errors.push(`${path} condition must be an object.`);
    return;
  }

  if ("expr" in condition) {
    if (typeof condition.expr !== "string") {
      errors.push(`${path} raw expression must be a string.`);
      return;
    }

    if (condition.expr.trim().length === 0) {
      errors.push(`${path} raw expression must not be empty.`);
    }

    return;
  }

  if ("signal" in condition) {
    if (typeof condition.signal !== "string") {
      errors.push(`${path} condition signal must be a string.`);
      return;
    }

    validateIdentifier("condition signal", condition.signal, errors);

    if (!declaredSignals.has(condition.signal)) {
      warnings.push(
        `${path} references condition signal "${condition.signal}" that is not declared as an input, output, clock, or reset.`,
      );
    }

    return;
  }

  if ("all" in condition) {
    if (!Array.isArray(condition.all)) {
      errors.push(`${path}.all condition group must be an array.`);
      return;
    }

    validateConditionGroup(
      "all",
      condition.all,
      path,
      errors,
      warnings,
      declaredSignals,
    );
    return;
  }

  if (!("any" in condition)) {
    errors.push(`${path} has an unknown condition shape.`);
    return;
  }

  if (!Array.isArray(condition.any)) {
    errors.push(`${path}.any condition group must be an array.`);
    return;
  }

  validateConditionGroup(
    "any",
    condition.any,
    path,
    errors,
    warnings,
    declaredSignals,
  );
}

function validateConditionGroup(
  groupName: "all" | "any",
  conditions: unknown[],
  path: string,
  errors: string[],
  warnings: string[],
  declaredSignals: Set<string>,
): void {
  if (conditions.length === 0) {
    errors.push(`${path}.${groupName} condition group must not be empty.`);
    return;
  }

  conditions.forEach((condition, index) => {
    validateCondition(
      condition,
      `${path}.${groupName}[${index}]`,
      errors,
      warnings,
      declaredSignals,
    );
  });
}

function validateSharedNameConflicts(model: FsmModel, errors: string[]): void {
  if (model.clock.name === model.clock.reset) {
    errors.push(`Clock/reset name "${model.clock.name}" must be unique.`);
  }

  const inputNames = new Set(model.ports.inputs.map((input) => input.name));
  for (const output of model.ports.outputs) {
    if (inputNames.has(output.name)) {
      errors.push(
        `Port name "${output.name}" is used by both an input and output.`,
      );
    }
  }

  const reservedNames = new Set([
    model.clock.name,
    model.clock.reset,
    ...model.ports.inputs.map((input) => input.name),
    ...model.ports.outputs.map((output) => output.name),
  ]);

  for (const state of model.states) {
    if (reservedNames.has(state.name)) {
      errors.push(
        `State name "${state.name}" must not collide with a port, clock, or reset name.`,
      );
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
