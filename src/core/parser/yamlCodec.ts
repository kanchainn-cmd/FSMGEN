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

    return {
      ok: true,
      model: normalizeModel(document.toJS() as FsmModelInput),
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
