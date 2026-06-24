import { useMemo, useState } from "react";
import { downloadArtifactsZip, downloadTextArtifact } from "./core/export/exportZip";
import { generateAllArtifacts } from "./core/generators";
import {
  createInitialAppState,
  updateDraftModel,
  updateYamlText,
} from "./core/state/appState";
import { ExportPanel } from "./ui/export/ExportPanel";
import { FsmForm } from "./ui/forms/FsmForm";
import { DiagnosticsPanel } from "./ui/preview/DiagnosticsPanel";
import { PreviewTabs } from "./ui/preview/PreviewTabs";
import { YamlEditor } from "./ui/yaml/YamlEditor";

export function App() {
  const [state, setState] = useState(createInitialAppState);
  const generatedArtifacts = useMemo(
    () => Object.values(generateAllArtifacts(state.lastValidModel)),
    [state.lastValidModel],
  );

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <h1>FSMGEN</h1>
          <p>Finite state machine generator</p>
        </div>
        <div className="status-pill" data-valid={state.validation.valid && !state.parseDiagnostic}>
          {state.validation.valid && !state.parseDiagnostic ? "Ready" : "Needs attention"}
        </div>
      </header>
      <section className="workspace">
        <section className="panel form-panel" aria-labelledby="form-heading">
          <div className="panel-heading">
            <h2 id="form-heading">Model</h2>
          </div>
          <FsmForm
            model={state.draftModel}
            onChange={(model) => setState((current) => updateDraftModel(current, model))}
          />
        </section>

        <section className="panel yaml-panel" aria-labelledby="yaml-heading">
          <div className="panel-heading">
            <h2 id="yaml-heading">YAML</h2>
          </div>
          <YamlEditor
            value={state.yamlText}
            onChange={(yamlText) => setState((current) => updateYamlText(current, yamlText))}
          />
        </section>

        <section className="side-stack">
          <DiagnosticsPanel
            parseDiagnostic={state.parseDiagnostic}
            validation={state.validation}
          />
          <PreviewTabs artifacts={generatedArtifacts} />
          <ExportPanel
            artifacts={generatedArtifacts}
            zipFilename={`${state.lastValidModel.module}_artifacts.zip`}
            onDownloadZip={downloadArtifactsZip}
            onDownloadArtifact={downloadTextArtifact}
          />
        </section>
      </section>
    </main>
  );
}
