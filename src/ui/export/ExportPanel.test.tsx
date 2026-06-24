import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ExportPanel } from "./ExportPanel";

const artifacts = [
  { filename: "traffic_fsm.sv", content: "module traffic_fsm;" },
  { filename: "traffic_fsm.v", content: "module traffic_fsm;" },
];

function deferredPromise() {
  let resolve!: () => void;
  const promise = new Promise<void>((settle) => {
    resolve = settle;
  });

  return { promise, resolve };
}

describe("ExportPanel", () => {
  it("disables the ZIP download button while the archive is pending", async () => {
    const user = userEvent.setup();
    const pendingZip = deferredPromise();
    const onDownloadZip = vi.fn(() => pendingZip.promise);

    render(
      <ExportPanel
        artifacts={artifacts}
        zipFilename="traffic_fsm_artifacts.zip"
        onDownloadArtifact={vi.fn()}
        onDownloadZip={onDownloadZip}
      />,
    );

    const zipButton = screen.getByRole("button", {
      name: "Download all artifacts as ZIP",
    });

    await user.click(zipButton);

    expect(zipButton).toBeDisabled();
    expect(zipButton).toHaveTextContent("Preparing ZIP...");

    pendingZip.resolve();
    await waitFor(() => expect(zipButton).toBeEnabled());
  });

  it("surfaces an error if ZIP download rejects", async () => {
    const user = userEvent.setup();

    render(
      <ExportPanel
        artifacts={artifacts}
        zipFilename="traffic_fsm_artifacts.zip"
        onDownloadArtifact={vi.fn()}
        onDownloadZip={vi.fn().mockRejectedValue(new Error("disk full"))}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Download all artifacts as ZIP" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent("disk full");
  });

  it("surfaces an error if single artifact download throws", async () => {
    const user = userEvent.setup();

    render(
      <ExportPanel
        artifacts={artifacts}
        zipFilename="traffic_fsm_artifacts.zip"
        onDownloadArtifact={vi.fn(() => {
          throw new Error("blocked");
        })}
        onDownloadZip={vi.fn()}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Download traffic_fsm.sv" }),
    );

    expect(screen.getByRole("alert")).toHaveTextContent("blocked");
  });
});
