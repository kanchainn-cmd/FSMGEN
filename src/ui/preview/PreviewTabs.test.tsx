import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { GeneratedArtifact } from "../../core/generators";
import { PreviewTabs } from "./PreviewTabs";

const artifacts: GeneratedArtifact[] = [
  {
    filename: "traffic_fsm.mmd",
    language: "mermaid",
    content: `stateDiagram-v2
  [*] --> RED
  RED --> GREEN : timer_done
  GREEN --> YELLOW : timer_done
`,
  },
  {
    filename: "traffic_fsm_transitions.md",
    language: "markdown",
    content: `| From | Condition | To | Moore Outputs |
| --- | --- | --- | --- |
| RED | timer_done | GREEN | red=1 |
| GREEN | timer_done | YELLOW | green=1 |
`,
  },
];

describe("PreviewTabs", () => {
  it("renders Mermaid state diagrams on demand while keeping code as the default", async () => {
    const user = userEvent.setup();
    render(<PreviewTabs artifacts={artifacts} />);

    expect(screen.getByLabelText("Artifact content")).toHaveTextContent("stateDiagram-v2");

    await user.click(screen.getByRole("button", { name: "Render" }));

    expect(screen.getByLabelText("Rendered state diagram")).toBeInTheDocument();
    expect(screen.getByText("RED")).toBeInTheDocument();
    expect(screen.getByText("GREEN")).toBeInTheDocument();
  });

  it("renders Markdown table artifacts on demand", async () => {
    const user = userEvent.setup();
    render(<PreviewTabs artifacts={artifacts} />);

    await user.click(screen.getByRole("tab", { name: "traffic_fsm_transitions.md" }));
    await user.click(screen.getByRole("button", { name: "Render" }));

    const table = screen.getByRole("table");

    expect(within(table).getByRole("columnheader", { name: "From" })).toBeInTheDocument();
    expect(within(table).getByRole("cell", { name: "YELLOW" })).toBeInTheDocument();
    expect(within(table).getByRole("cell", { name: "green=1" })).toBeInTheDocument();
  });
});
