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
transitions: []
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

  it("rejects top-level scalar YAML", () => {
    const parsed = parseFsmYaml("not-a-model\n");

    expect(parsed.ok).toBe(false);
    if (parsed.ok) {
      return;
    }

    expect(parsed.diagnostic.message).not.toHaveLength(0);
  });

  it("rejects YAML missing required clock configuration", () => {
    const parsed = parseFsmYaml(`version: 1
module: missing_clock
flavor: systemverilog
mealy: false
ports:
  inputs: []
  outputs: []
states:
  - name: IDLE
transitions: []
initial: IDLE
`);

    expect(parsed.ok).toBe(false);
    if (parsed.ok) {
      return;
    }

    expect(parsed.diagnostic.message).toContain("clock");
  });

  it("rejects wrong port collection types", () => {
    const parsed = parseFsmYaml(`version: 1
module: bad_ports
flavor: systemverilog
mealy: false
clock:
  name: clk
  reset: rst_n
  reset_active: low
ports:
  inputs: nope
  outputs: []
states:
  - name: IDLE
initial: IDLE
`);

    expect(parsed.ok).toBe(false);
    if (parsed.ok) {
      return;
    }

    expect(parsed.diagnostic.message).toContain("ports.inputs");
  });

  it("rejects cyclic aliases without throwing", () => {
    const parsed = parseFsmYaml(`version: 1
module: cyclic_outputs
flavor: systemverilog
mealy: false
clock:
  name: clk
  reset: rst_n
  reset_active: low
ports:
  inputs: []
  outputs: []
states:
  - name: IDLE
    outputs: &out { x: *out }
initial: IDLE
`);

    expect(parsed.ok).toBe(false);
    if (parsed.ok) {
      return;
    }

    expect(parsed.diagnostic.message).toMatch(/alias|cyclic/i);
  });

  it("rejects non-scalar state output assignments", () => {
    const parsed = parseFsmYaml(`version: 1
module: nonscalar_outputs
flavor: systemverilog
mealy: false
clock:
  name: clk
  reset: rst_n
  reset_active: low
ports:
  inputs: []
  outputs: []
states:
  - name: IDLE
    outputs:
      done:
        nested: 1
initial: IDLE
`);

    expect(parsed.ok).toBe(false);
    if (parsed.ok) {
      return;
    }

    expect(parsed.diagnostic.message).toContain("states[0].outputs.done");
  });

  it("rejects non-scalar transition output assignments", () => {
    const parsed = parseFsmYaml(`version: 1
module: nonscalar_transition_outputs
flavor: systemverilog
mealy: true
clock:
  name: clk
  reset: rst_n
  reset_active: low
ports:
  inputs: []
  outputs: []
states:
  - name: IDLE
transitions:
  - from: IDLE
    to: IDLE
    when:
      expr: go
    outputs:
      done:
        nested: 1
initial: IDLE
`);

    expect(parsed.ok).toBe(false);
    if (parsed.ok) {
      return;
    }

    expect(parsed.diagnostic.message).toContain("transitions[0].outputs.done");
  });
});
