import type { Condition, FsmModel } from "../schema/types";

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
  validateNamedItems(
    "state",
    model.states.map((state) => state.name),
    errors,
  );

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

function validateCondition(
  condition: Condition,
  path: string,
  errors: string[],
  warnings: string[],
  declaredSignals: Set<string>,
): void {
  if ("expr" in condition) {
    if (condition.expr.trim().length === 0) {
      errors.push(`${path} raw expression must not be empty.`);
    }

    return;
  }

  if ("signal" in condition) {
    validateIdentifier("condition signal", condition.signal, errors);

    if (!declaredSignals.has(condition.signal)) {
      warnings.push(
        `${path} references condition signal "${condition.signal}" that is not declared as an input, output, clock, or reset.`,
      );
    }

    return;
  }

  if ("all" in condition) {
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
  conditions: Condition[],
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
