import { useEffect, useState } from "react";
import type { GeneratedArtifact } from "../../core/generators";

export function PreviewTabs({ artifacts }: { artifacts: GeneratedArtifact[] }) {
  const [activeFilename, setActiveFilename] = useState(artifacts[0]?.filename ?? "");
  const activeArtifact =
    artifacts.find((artifact) => artifact.filename === activeFilename) ?? artifacts[0];

  useEffect(() => {
    if (!artifacts.some((artifact) => artifact.filename === activeFilename)) {
      setActiveFilename(artifacts[0]?.filename ?? "");
    }
  }, [activeFilename, artifacts]);

  return (
    <section className="panel preview-panel" aria-labelledby="preview-heading">
      <div className="panel-heading">
        <h2 id="preview-heading">Preview</h2>
      </div>

      <div className="tabs" role="tablist" aria-label="Generated artifacts">
        {artifacts.map((artifact) => (
          <button
            aria-controls={`artifact-panel-${artifact.filename}`}
            aria-selected={artifact.filename === activeArtifact?.filename}
            className="tab-button"
            id={`artifact-tab-${artifact.filename}`}
            key={artifact.filename}
            onClick={() => setActiveFilename(artifact.filename)}
            role="tab"
            type="button"
          >
            {artifact.filename}
          </button>
        ))}
      </div>

      {activeArtifact ? (
        <pre
          aria-label="Artifact content"
          aria-labelledby={`artifact-tab-${activeArtifact.filename}`}
          className={`artifact-preview language-${activeArtifact.language}`}
          id={`artifact-panel-${activeArtifact.filename}`}
          role="tabpanel"
        >
          <code>{activeArtifact.content}</code>
        </pre>
      ) : (
        <p className="empty-state">No artifacts generated</p>
      )}
    </section>
  );
}
