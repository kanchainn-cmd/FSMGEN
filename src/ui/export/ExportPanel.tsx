import { useState } from "react";
import type { ExportableArtifact } from "../../core/export/exportZip";

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message.length > 0) {
    return error.message;
  }

  return "Export failed.";
}

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
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [zipPending, setZipPending] = useState(false);

  async function handleDownloadZip() {
    setDownloadError(null);
    setZipPending(true);

    try {
      await onDownloadZip(artifacts, zipFilename);
    } catch (error) {
      setDownloadError(errorMessage(error));
    } finally {
      setZipPending(false);
    }
  }

  function handleDownloadArtifact(artifact: ExportableArtifact) {
    setDownloadError(null);

    try {
      onDownloadArtifact(artifact);
    } catch (error) {
      setDownloadError(errorMessage(error));
    }
  }

  return (
    <section className="panel export-panel" aria-label="Export artifacts">
      <div className="panel-heading">
        <h2>Export</h2>
      </div>

      {downloadError ? (
        <p className="export-error" role="alert">
          {downloadError}
        </p>
      ) : null}

      <button
        className="primary-action"
        disabled={zipPending}
        onClick={() => void handleDownloadZip()}
        type="button"
      >
        {zipPending ? "Preparing ZIP..." : "Download all artifacts as ZIP"}
      </button>

      <div className="download-grid">
        {artifacts.map((artifact) => (
          <button
            key={artifact.filename}
            onClick={() => handleDownloadArtifact(artifact)}
            type="button"
          >
            Download {artifact.filename}
          </button>
        ))}
      </div>
    </section>
  );
}
