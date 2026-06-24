import { describe, expect, it } from "vitest";
import { collectConditionSignals } from "./inspectCondition";

describe("condition inspection", () => {
  it("collects structured signal references in order", () => {
    expect(
      collectConditionSignals({
        all: [
          { signal: "start", op: "==", value: 1 },
          {
            any: [
              { signal: "mode", op: "==", value: "2'b01" },
              { signal: "force", op: "!=", value: 0 },
            ],
          },
        ],
      }),
    ).toEqual([
      { signal: "start", op: "==", value: 1 },
      { signal: "mode", op: "==", value: "2'b01" },
      { signal: "force", op: "!=", value: 0 },
    ]);
  });

  it("returns no structured signal references for raw expressions", () => {
    expect(collectConditionSignals({ expr: "start && ready" })).toEqual([]);
  });
});
