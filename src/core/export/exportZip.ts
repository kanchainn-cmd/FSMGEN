import { saveAs } from "file-saver";
import JSZip from "jszip";

export interface ExportableArtifact {
  filename: string;
  content: string;
}

export async function buildArtifactZipBlob(
  artifacts: ExportableArtifact[],
): Promise<Blob> {
  const zip = new JSZip();

  for (const artifact of artifacts) {
    zip.file(artifact.filename, artifact.content);
  }

  return zip.generateAsync({ type: "blob", mimeType: "application/zip" });
}

export async function downloadArtifactsZip(
  artifacts: ExportableArtifact[],
  filename: string,
): Promise<void> {
  const blob = await buildArtifactZipBlob(artifacts);
  saveAs(blob, filename);
}

export function downloadTextArtifact(artifact: ExportableArtifact): void {
  const blob = new Blob([artifact.content], {
    type: "text/plain;charset=utf-8",
  });
  saveAs(blob, artifact.filename);
}
