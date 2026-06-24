import { describe, expect, it } from "vitest";
import { createDefaultModel, normalizeModel } from "../schema/defaults";
import { parseFsmYaml, serializeFsmYaml } from "./yamlCodec";

describe("FSM YAML codec", () => {
  it("round-trips the default model through normalized YAML", () => {
    const model = createDefaultModel();

    const parsed = parseFsmYaml(serializeFsmYaml(model));

    expect(parsed).toEqual({
      ok: true,
      model: normalizeModel(model),
    });
  });

  it("normalizes parsed YAML input", () => {
    const parsed = parseFsmYaml(`version: 1
module: simple
flavor: verilog2001
mealy: false
clock:
  name: clk
  reset: rst
  reset_active: high
ports:
  inputs:
    - name: go
  outputs:
    - name: done
states:
  - name: IDLE
initial: IDLE
`);

    expect(parsed).toEqual({
      ok: true,
      model: {
        version: 1,
        module: "simple",
        flavor: "verilog2001",
        mealy: false,
        clock: { name: "clk", reset: "rst", reset_active: "high" },
        ports: {
          inputs: [{ name: "go", width: 1 }],
          outputs: [{ name: "done", width: 1 }],
        },
        states: [{ name: "IDLE", outputs: {} }],
        transitions: [],
        initial: "IDLE",
      },
    });
  });

  it("returns a diagnostic for invalid YAML", () => {
    const parsed = parseFsmYaml(`version: 1
module: bad
ports:
  inputs:
    - name: start
      width: [1
`);

    expect(parsed.ok).toBe(false);
    if (parsed.ok) {
      return;
    }

    expect(parsed.diagnostic.message).not.toHaveLength(0);
    expect(parsed.diagnostic.line).toBeGreaterThan(0);
    expect(parsed.diagnostic.column).toBeGreaterThan(0);
  });
});
