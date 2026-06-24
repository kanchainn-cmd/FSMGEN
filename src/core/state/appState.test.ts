import { describe, expect, it } from "vitest";
import { serializeFsmYaml } from "../parser/yamlCodec";
import { createDefaultModel } from "../schema/defaults";
import type { FsmModel } from "../schema/types";
import {
  createInitialAppState,
  updateDraftModel,
  updateYamlText,
} from "./appState";

function renamedModel(moduleName: string): FsmModel {
  return {
    ...createDefaultModel(),
    module: moduleName,
  };
}

describe("app state synchronization", () => {
  it("creates synchronized initial state from the default model", () => {
    const state = createInitialAppState();
    const defaultModel = createDefaultModel();

    expect(state.draftModel).toEqual(defaultModel);
    expect(state.lastValidModel).toEqual(defaultModel);
    expect(state.draftModel).not.toBe(state.lastValidModel);
    expect(state.draftModel.clock).not.toBe(state.lastValidModel.clock);
    expect(state.draftModel.ports.inputs).not.toBe(
      state.lastValidModel.ports.inputs,
    );
    expect(state.yamlText).toBe(serializeFsmYaml(defaultModel));
    expect(state.parseDiagnostic).toBeNull();
    expect(state.validation.valid).toBe(true);
    expect(state.validation.errors).toEqual([]);
  });

  it("serializes and promotes a valid draft model", () => {
    const state = createInitialAppState();
    const draftModel = renamedModel("renamed_controller");

    const updated = updateDraftModel(state, draftModel);

    expect(updated.draftModel).toEqual(draftModel);
    expect(updated.lastValidModel).toEqual(draftModel);
    expect(updated.draftModel).not.toBe(updated.lastValidModel);
    expect(updated.draftModel.clock).not.toBe(updated.lastValidModel.clock);
    expect(updated.yamlText).toBe(serializeFsmYaml(draftModel));
    expect(updated.parseDiagnostic).toBeNull();
    expect(updated.validation.valid).toBe(true);
  });

  it("serializes but does not promote an invalid draft model", () => {
    const state = createInitialAppState();
    const invalidDraft: FsmModel = {
      ...renamedModel("invalid_controller"),
      initial: "MISSING",
    };

    const updated = updateDraftModel(state, invalidDraft);

    expect(updated.draftModel).toEqual(invalidDraft);
    expect(updated.lastValidModel).toEqual(state.lastValidModel);
    expect(updated.yamlText).toBe(serializeFsmYaml(invalidDraft));
    expect(updated.parseDiagnostic).toBeNull();
    expect(updated.validation.valid).toBe(false);
    expect(updated.validation.errors).toEqual([
      expect.stringContaining("Initial state"),
    ]);
  });

  it("preserves models and records diagnostics when YAML parsing fails", () => {
    const state = createInitialAppState();
    const yamlText = `version: 1
module: bad
ports:
  inputs:
    - name: start
      width: [1
`;

    const updated = updateYamlText(state, yamlText);

    expect(updated.yamlText).toBe(yamlText);
    expect(updated.draftModel).toEqual(state.draftModel);
    expect(updated.lastValidModel).toEqual(state.lastValidModel);
    expect(updated.parseDiagnostic).not.toBeNull();
    expect(updated.validation).toEqual(state.validation);
  });

  it("does not throw and preserves last valid model when YAML is missing clock", () => {
    const state = createInitialAppState();
    const yamlText = `version: 1
module: missing_clock
flavor: systemverilog
mealy: false
ports:
  inputs: []
  outputs: []
states:
  - name: IDLE
transitions: []
initial: IDLE
`;

    const updated = updateYamlText(state, yamlText);

    expect(updated.yamlText).toBe(yamlText);
    expect(updated.draftModel).toEqual(state.draftModel);
    expect(updated.lastValidModel).toEqual(state.lastValidModel);
    expect(updated.parseDiagnostic?.message).toContain("clock");
    expect(updated.validation).toEqual(state.validation);
  });

  it("updates the draft but preserves last valid model when parsed YAML is invalid", () => {
    const state = createInitialAppState();
    const parsedInvalidModel: FsmModel = {
      ...renamedModel("parsed_invalid_controller"),
      initial: "MISSING",
    };
    const yamlText = serializeFsmYaml(parsedInvalidModel);

    const updated = updateYamlText(state, yamlText);

    expect(updated.yamlText).toBe(yamlText);
    expect(updated.draftModel).toEqual(parsedInvalidModel);
    expect(updated.lastValidModel).toEqual(state.lastValidModel);
    expect(updated.parseDiagnostic).toBeNull();
    expect(updated.validation.valid).toBe(false);
    expect(updated.validation.errors).toEqual([
      expect.stringContaining("Initial state"),
    ]);
  });

  it("updates draft and last valid model when parsed YAML is valid", () => {
    const state = createInitialAppState();
    const parsedValidModel = renamedModel("parsed_valid_controller");
    const yamlText = serializeFsmYaml(parsedValidModel);

    const updated = updateYamlText(state, yamlText);

    expect(updated.yamlText).toBe(yamlText);
    expect(updated.draftModel).toEqual(parsedValidModel);
    expect(updated.lastValidModel).toEqual(parsedValidModel);
    expect(updated.draftModel).not.toBe(updated.lastValidModel);
    expect(updated.parseDiagnostic).toBeNull();
    expect(updated.validation.valid).toBe(true);
  });

  it("promotes warning-only validation results as valid", () => {
    const state = createInitialAppState();
    const warningOnlyModel: FsmModel = {
      ...renamedModel("warning_controller"),
      transitions: [
        {
          from: "IDLE",
          to: "IDLE",
          when: { signal: "unknown_signal", op: "==", value: 1 },
          outputs: {},
        },
      ],
    };

    const updated = updateDraftModel(state, warningOnlyModel);

    expect(updated.validation.valid).toBe(true);
    expect(updated.validation.warnings).toEqual([
      expect.stringContaining("unknown_signal"),
    ]);
    expect(updated.lastValidModel).toEqual(warningOnlyModel);
  });

  it("promotes warning-only parsed YAML and clears parse diagnostics", () => {
    const stateWithDiagnostic = {
      ...createInitialAppState(),
      parseDiagnostic: { message: "previous parse failure" },
    };
    const warningOnlyModel: FsmModel = {
      ...renamedModel("warning_yaml_controller"),
      transitions: [
        {
          from: "IDLE",
          to: "IDLE",
          when: { signal: "unknown_signal", op: "==", value: 1 },
          outputs: {},
        },
      ],
    };
    const yamlText = serializeFsmYaml(warningOnlyModel);

    const updated = updateYamlText(stateWithDiagnostic, yamlText);

    expect(updated.parseDiagnostic).toBeNull();
    expect(updated.validation.valid).toBe(true);
    expect(updated.validation.warnings).toEqual([
      expect.stringContaining("unknown_signal"),
    ]);
    expect(updated.draftModel).toEqual(warningOnlyModel);
    expect(updated.lastValidModel).toEqual(warningOnlyModel);
    expect(updated.draftModel).not.toBe(updated.lastValidModel);
  });
});
