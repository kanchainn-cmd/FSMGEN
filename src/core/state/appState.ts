import {
  parseFsmYaml,
  serializeFsmYaml,
  type FsmYamlDiagnostic,
} from "../parser/yamlCodec";
import { createDefaultModel } from "../schema/defaults";
import type { FsmModel } from "../schema/types";
import { validateModel, type ValidationResult } from "../validators/validateModel";

export interface AppState {
  draftModel: FsmModel;
  lastValidModel: FsmModel;
  yamlText: string;
  parseDiagnostic: FsmYamlDiagnostic | null;
  validation: ValidationResult;
}

function cloneFsmModel(model: FsmModel): FsmModel {
  return JSON.parse(JSON.stringify(model)) as FsmModel;
}

export function createInitialAppState(): AppState {
  const model = createDefaultModel();

  return {
    draftModel: model,
    lastValidModel: cloneFsmModel(model),
    yamlText: serializeFsmYaml(model),
    parseDiagnostic: null,
    validation: validateModel(model),
  };
}

export function updateDraftModel(state: AppState, draftModel: FsmModel): AppState {
  const validation = validateModel(draftModel);

  return {
    ...state,
    draftModel,
    lastValidModel: validation.valid ? cloneFsmModel(draftModel) : state.lastValidModel,
    yamlText: serializeFsmYaml(draftModel),
    parseDiagnostic: null,
    validation,
  };
}

export function updateYamlText(state: AppState, yamlText: string): AppState {
  const parsed = parseFsmYaml(yamlText);

  if (!parsed.ok) {
    return {
      ...state,
      yamlText,
      parseDiagnostic: parsed.diagnostic,
    };
  }

  const validation = validateModel(parsed.model);

  return {
    ...state,
    draftModel: parsed.model,
    lastValidModel: validation.valid ? cloneFsmModel(parsed.model) : state.lastValidModel,
    yamlText,
    parseDiagnostic: null,
    validation,
  };
}
