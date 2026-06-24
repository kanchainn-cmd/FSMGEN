import type { ExportableArtifact } from "../../core/export/exportZip";

export function ExportPanel({
  artifacts,
  zipFilename,
  onDownloadZip,
  onDownloadArtifact,
}: {
  artifacts: ExportableArtifact[];
  zipFilename: string;
  onDownloadZip: (artifacts: ExportableArtifact[], filename: string) => void | Promise<void>;
  onDownloadArtifact: (artifact: ExportableArtifact) => void;
}) {
  return (
    <section className="panel export-panel" aria-label="Export artifacts">
      <div className="panel-heading">
        <h2>Export</h2>
      </div>

      <button
        className="primary-action"
        onClick={() => void onDownloadZip(artifacts, zipFilename)}
        type="button"
      >
        Download all artifacts as ZIP
      </button>

      <div className="download-grid">
        {artifacts.map((artifact) => (
          <button
            key={artifact.filename}
            onClick={() => onDownloadArtifact(artifact)}
            type="button"
          >
            Download {artifact.filename}
          </button>
        ))}
      </div>
    </section>
  );
}
