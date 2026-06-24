import type { FsmYamlDiagnostic } from "../../core/parser/yamlCodec";
import type { ValidationResult } from "../../core/validators/validateModel";

export function DiagnosticsPanel({
  parseDiagnostic,
  validation,
}: {
  parseDiagnostic: FsmYamlDiagnostic | null;
  validation: ValidationResult;
}) {
  const hasDiagnostics =
    parseDiagnostic !== null ||
    validation.errors.length > 0 ||
    validation.warnings.length > 0;

  return (
    <section className="panel diagnostics-panel" aria-labelledby="diagnostics-heading">
      <div className="panel-heading">
        <h2 id="diagnostics-heading">Diagnostics</h2>
      </div>

      {!hasDiagnostics ? (
        <p className="empty-state">No diagnostics</p>
      ) : (
        <div className="diagnostics-list">
          {parseDiagnostic ? (
            <article className="diagnostic diagnostic-error">
              <strong>YAML parse</strong>
              <p>
                {parseDiagnostic.message}
                {parseDiagnostic.line ? (
                  <span>
                    {" "}
                    Line {parseDiagnostic.line}
                    {parseDiagnostic.column ? `:${parseDiagnostic.column}` : ""}
                  </span>
                ) : null}
              </p>
            </article>
          ) : null}

          {validation.errors.map((error, index) => (
            <article className="diagnostic diagnostic-error" key={`error-${index}-${error}`}>
              <strong>Validation error</strong>
              <p>{error}</p>
            </article>
          ))}

          {validation.warnings.map((warning, index) => (
            <article
              className="diagnostic diagnostic-warning"
              key={`warning-${index}-${warning}`}
            >
              <strong>Warning</strong>
              <p>{warning}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
