import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";
import {
  downloadArtifactsZip,
  downloadTextArtifact,
} from "./core/export/exportZip";

vi.mock("./core/export/exportZip", async () => {
  const actual = await vi.importActual<typeof import("./core/export/exportZip")>(
    "./core/export/exportZip",
  );

  return {
    ...actual,
    downloadArtifactsZip: vi.fn().mockResolvedValue(undefined),
    downloadTextArtifact: vi.fn(),
  };
});

describe("App", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("integrates form editing, YAML diagnostics, previews, and artifact exports", async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(screen.getByRole("form", { name: "FSM editor" })).toBeInTheDocument();
    const yamlSource = screen.getByLabelText("YAML source") as HTMLTextAreaElement;
    expect(yamlSource.value).toContain("module: fsm_controller");
    expect(screen.getByText("No diagnostics")).toBeInTheDocument();

    await user.clear(screen.getByLabelText("Module name"));
    await user.type(screen.getByLabelText("Module name"), "traffic_fsm");

    expect(yamlSource.value).toContain("module: traffic_fsm");
    expect(screen.getByRole("tab", { name: "traffic_fsm.sv" })).toBeInTheDocument();
    expect(screen.getByLabelText("Artifact content")).toHaveTextContent("module traffic_fsm");

    fireEvent.change(yamlSource, {
      target: {
        value: `version: 1
module: broken
ports:
  inputs:
    - name: start
      width: [1
`,
      },
    });

    expect(screen.getByText(/YAML parse/i)).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "traffic_fsm.sv" })).toBeInTheDocument();
    expect(screen.getByLabelText("Artifact content")).toHaveTextContent("module traffic_fsm");

    await user.click(screen.getByRole("button", { name: "Download all artifacts as ZIP" }));
    expect(downloadArtifactsZip).toHaveBeenCalledTimes(1);
    expect(downloadArtifactsZip).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ filename: "traffic_fsm.sv" }),
        expect.objectContaining({ filename: "traffic_fsm.v" }),
      ]),
      "traffic_fsm_artifacts.zip",
    );

    const exportPanel = screen.getByRole("region", { name: "Export artifacts" });
    await user.click(within(exportPanel).getByRole("button", { name: "Download traffic_fsm.sv" }));
    expect(downloadTextArtifact).toHaveBeenCalledWith(
      expect.objectContaining({ filename: "traffic_fsm.sv" }),
    );
  });
});
