import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DiagnosticsPanel } from "./DiagnosticsPanel";

describe("DiagnosticsPanel", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders duplicate validation messages without React duplicate-key warnings", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <DiagnosticsPanel
        parseDiagnostic={null}
        validation={{
          valid: false,
          errors: ["Duplicate state name.", "Duplicate state name."],
          warnings: ["Unknown signal.", "Unknown signal."],
        }}
      />,
    );

    expect(screen.getAllByText("Duplicate state name.")).toHaveLength(2);
    expect(screen.getAllByText("Unknown signal.")).toHaveLength(2);
    expect(
      consoleError.mock.calls.flat().map((message) => String(message)),
    ).not.toEqual(
      expect.arrayContaining([
        expect.stringContaining("Encountered two children with the same key"),
      ]),
    );
  });
});
