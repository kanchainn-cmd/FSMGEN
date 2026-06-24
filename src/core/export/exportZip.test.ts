import { saveAs } from "file-saver";
import JSZip from "jszip";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildArtifactZipBlob,
  downloadArtifactsZip,
  downloadTextArtifact,
} from "./exportZip";

vi.mock("file-saver", () => ({
  saveAs: vi.fn(),
}));

function readBlobAsText(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result)));
    reader.addEventListener("error", () => reject(reader.error));
    reader.readAsText(blob);
  });
}

describe("artifact zip export", () => {
  beforeEach(() => {
    vi.mocked(saveAs).mockClear();
  });

  it("creates a zip blob from artifact contents", async () => {
    const blob = await buildArtifactZipBlob([
      { filename: "fsm.sv", content: "module fsm; endmodule" },
      { filename: "fsm.mmd", content: "stateDiagram-v2" },
    ]);

    expect(blob.size).toBeGreaterThan(0);
    expect(blob.type).toBe("application/zip");

    const zip = await JSZip.loadAsync(blob);
    await expect(zip.file("fsm.sv")?.async("string")).resolves.toBe(
      "module fsm; endmodule",
    );
    await expect(zip.file("fsm.mmd")?.async("string")).resolves.toBe(
      "stateDiagram-v2",
    );
  });

  it("downloads all artifacts as a zip file", async () => {
    await downloadArtifactsZip(
      [{ filename: "fsm.sv", content: "module fsm; endmodule" }],
      "fsm-artifacts.zip",
    );

    expect(saveAs).toHaveBeenCalledTimes(1);
    expect(saveAs).toHaveBeenCalledWith(expect.any(Blob), "fsm-artifacts.zip");

    const blob = vi.mocked(saveAs).mock.calls[0][0] as Blob;
    const zip = await JSZip.loadAsync(blob);
    await expect(zip.file("fsm.sv")?.async("string")).resolves.toBe(
      "module fsm; endmodule",
    );
  });

  it("downloads one text artifact using its filename", async () => {
    downloadTextArtifact({
      filename: "fsm.mmd",
      content: "stateDiagram-v2",
    });

    expect(saveAs).toHaveBeenCalledWith(expect.any(Blob), "fsm.mmd");

    const blob = vi.mocked(saveAs).mock.calls[0][0] as Blob;
    await expect(readBlobAsText(blob)).resolves.toBe("stateDiagram-v2");
    expect(blob.type).toBe("text/plain;charset=utf-8");
  });
});
