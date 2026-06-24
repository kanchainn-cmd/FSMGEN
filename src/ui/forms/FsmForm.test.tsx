import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createDefaultModel } from "../../core/schema/defaults";
import type { FsmModel } from "../../core/schema/types";
import { FsmForm } from "./FsmForm";

function ControlledForm({
  initialModel = createDefaultModel(),
  onModelChange,
}: {
  initialModel?: FsmModel;
  onModelChange?: (model: FsmModel) => void;
}) {
  const [model, setModel] = useState(initialModel);

  return (
    <>
      <FsmForm
        model={model}
        onChange={(nextModel) => {
          setModel(nextModel);
          onModelChange?.(nextModel);
        }}
      />
      <output aria-label="Current module">{model.module}</output>
      <output aria-label="Current model">{JSON.stringify(model)}</output>
    </>
  );
}

function currentModel(): FsmModel {
  return JSON.parse(screen.getByLabelText("Current model").textContent ?? "{}");
}

describe("FsmForm", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("edits module settings through controlled model changes", async () => {
    const user = userEvent.setup();
    render(<ControlledForm />);

    await user.clear(screen.getByLabelText("Module name"));
    await user.type(screen.getByLabelText("Module name"), "traffic_fsm");
    await user.selectOptions(screen.getByLabelText("HDL flavor"), "verilog2001");
    await user.click(screen.getByLabelText("Mealy machine"));
    await user.clear(screen.getByLabelText("Clock signal"));
    await user.type(screen.getByLabelText("Clock signal"), "clk_i");
    await user.clear(screen.getByLabelText("Reset signal"));
    await user.type(screen.getByLabelText("Reset signal"), "rst_i");
    await user.selectOptions(screen.getByLabelText("Reset polarity"), "high");

    expect(screen.getByLabelText("Current module")).toHaveTextContent("traffic_fsm");
    expect(currentModel()).toMatchObject({
      module: "traffic_fsm",
      flavor: "verilog2001",
      mealy: true,
      clock: { name: "clk_i", reset: "rst_i", reset_active: "high" },
    });
  });

  it("edits ports, states, conditions, transitions, and outputs immutably", async () => {
    const user = userEvent.setup();
    const changes: FsmModel[] = [];
    const initialModel: FsmModel = {
      ...createDefaultModel(),
      mealy: true,
      states: [
        { name: "IDLE", outputs: { done: 0 } },
        { name: "BUSY", outputs: { done: 0 } },
      ],
      transitions: [
        {
          from: "IDLE",
          to: "BUSY",
          when: { all: [{ signal: "start", op: "==", value: 1 }] },
          outputs: { done: 1 },
        },
      ],
    };

    render(<ControlledForm initialModel={initialModel} onModelChange={changes.push.bind(changes)} />);

    await user.click(screen.getByRole("button", { name: "Add input port" }));
    const inputRows = screen.getAllByTestId("input-port-row");
    await user.clear(within(inputRows[1]).getByLabelText("Input port 2 name"));
    await user.type(within(inputRows[1]).getByLabelText("Input port 2 name"), "enable");
    await user.clear(within(inputRows[1]).getByLabelText("Input port 2 width"));
    await user.type(within(inputRows[1]).getByLabelText("Input port 2 width"), "4");

    await user.click(screen.getByRole("button", { name: "Add output port" }));
    const outputRows = screen.getAllByTestId("output-port-row");
    await user.clear(within(outputRows[1]).getByLabelText("Output port 2 name"));
    await user.type(within(outputRows[1]).getByLabelText("Output port 2 name"), "error");

    await user.click(screen.getByRole("button", { name: "Add state" }));
    const stateRows = screen.getAllByTestId("state-row");
    await user.clear(within(stateRows[2]).getByLabelText("State 3 name"));
    await user.type(within(stateRows[2]).getByLabelText("State 3 name"), "DONE");
    await user.click(within(stateRows[2]).getByLabelText("Initial state 3"));
    await user.clear(
      within(stateRows[2]).getByLabelText("Moore output done for state 3 output 1"),
    );
    await user.type(
      within(stateRows[2]).getByLabelText("Moore output done for state 3 output 1"),
      "1",
    );
    await user.clear(
      within(stateRows[2]).getByLabelText("Moore output error for state 3 output 2"),
    );
    await user.type(
      within(stateRows[2]).getByLabelText("Moore output error for state 3 output 2"),
      "0",
    );

    const transitionRow = screen.getByTestId("transition-row-1");
    expect(within(transitionRow).getByLabelText("Condition type")).toHaveValue("all");
    expect(within(transitionRow).getByLabelText("Condition 1 signal")).toHaveValue(
      "start",
    );
    await user.selectOptions(within(transitionRow).getByLabelText("Condition type"), "atomic");
    await user.clear(within(transitionRow).getByLabelText("Condition signal"));
    await user.type(within(transitionRow).getByLabelText("Condition signal"), "enable");
    await user.selectOptions(within(transitionRow).getByLabelText("Condition operator"), "!=");
    await user.clear(within(transitionRow).getByLabelText("Condition value"));
    await user.type(within(transitionRow).getByLabelText("Condition value"), "0");
    await user.clear(
      within(transitionRow).getByLabelText("Mealy output done 1 for transition 1"),
    );
    await user.type(
      within(transitionRow).getByLabelText("Mealy output done 1 for transition 1"),
      "0",
    );

    await user.click(screen.getByRole("button", { name: "Add transition" }));

    const model = currentModel();
    expect(model.ports.inputs).toContainEqual({ name: "enable", width: 4 });
    expect(model.ports.outputs).toContainEqual({ name: "error", width: 1 });
    expect(model.initial).toBe("DONE");
    expect(model.states[2]).toEqual({ name: "DONE", outputs: { done: "1", error: "0" } });
    expect(model.transitions[0]).toMatchObject({
      from: "IDLE",
      to: "BUSY",
      when: { signal: "enable", op: "!=", value: "0" },
      outputs: { done: "0" },
    });
    expect(model.transitions).toHaveLength(2);
    expect(model.transitions[1]).toMatchObject({
      from: "DONE",
      to: "DONE",
      when: { expr: "" },
    });

    expect(changes[0]).not.toBe(initialModel);
    expect(initialModel.ports.inputs).toEqual([{ name: "start", width: 1 }]);
    expect(initialModel.transitions[0].when).toEqual({
      all: [{ signal: "start", op: "==", value: 1 }],
    });
  });

  it("does not emit zero width while clearing and replacing a port width", async () => {
    const user = userEvent.setup();
    const changes: FsmModel[] = [];

    render(<ControlledForm onModelChange={changes.push.bind(changes)} />);

    await user.clear(screen.getByLabelText("Input port 1 width"));
    await user.type(screen.getByLabelText("Input port 1 width"), "8");

    expect(changes.map((model) => model.ports.inputs[0].width)).not.toContain(0);
    expect(currentModel().ports.inputs[0].width).toBe(8);
  });

  it("edits all and any condition groups without converting them to raw expressions", async () => {
    const user = userEvent.setup();
    const initialModel: FsmModel = {
      ...createDefaultModel(),
      transitions: [
        {
          from: "IDLE",
          to: "IDLE",
          when: { expr: "start" },
          outputs: {},
        },
      ],
    };

    render(<ControlledForm initialModel={initialModel} />);

    const transitionRow = screen.getByTestId("transition-row-1");
    await user.selectOptions(within(transitionRow).getByLabelText("Condition type"), "all");
    await user.selectOptions(
      within(transitionRow).getByLabelText("Condition 1 type"),
      "atomic",
    );
    await user.clear(within(transitionRow).getByLabelText("Condition 1 signal"));
    await user.type(within(transitionRow).getByLabelText("Condition 1 signal"), "start");
    await user.selectOptions(within(transitionRow).getByLabelText("Condition 1 operator"), "==");
    await user.clear(within(transitionRow).getByLabelText("Condition 1 value"));
    await user.type(within(transitionRow).getByLabelText("Condition 1 value"), "1");

    await user.click(within(transitionRow).getByRole("button", { name: "Add condition to all" }));
    await user.selectOptions(
      within(transitionRow).getByLabelText("Condition 2 type"),
      "any",
    );
    await user.selectOptions(
      within(transitionRow).getByLabelText("Condition 2.1 type"),
      "atomic",
    );
    await user.clear(within(transitionRow).getByLabelText("Condition 2.1 signal"));
    await user.type(within(transitionRow).getByLabelText("Condition 2.1 signal"), "start");
    await user.selectOptions(
      within(transitionRow).getByLabelText("Condition 2.1 operator"),
      "!=",
    );
    await user.clear(within(transitionRow).getByLabelText("Condition 2.1 value"));
    await user.type(within(transitionRow).getByLabelText("Condition 2.1 value"), "0");

    expect(currentModel().transitions[0].when).toEqual({
      all: [
        { signal: "start", op: "==", value: "1" },
        { any: [{ signal: "start", op: "!=", value: "0" }] },
      ],
    });
  });

  it("clears transition outputs when Mealy mode is turned off", async () => {
    const user = userEvent.setup();
    const initialModel: FsmModel = {
      ...createDefaultModel(),
      mealy: true,
      transitions: [
        {
          from: "IDLE",
          to: "IDLE",
          when: { expr: "start" },
          outputs: { done: 1 },
        },
      ],
    };

    render(<ControlledForm initialModel={initialModel} />);

    await user.click(screen.getByLabelText("Mealy machine"));

    const model = currentModel();
    expect(model.mealy).toBe(false);
    expect(model.transitions[0].outputs).toEqual({});
  });

  it("renders duplicate draft state and output names without React key warnings", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const initialModel: FsmModel = {
      ...createDefaultModel(),
      ports: {
        inputs: [{ name: "start", width: 1 }],
        outputs: [
          { name: "done", width: 1 },
          { name: "done", width: 1 },
        ],
      },
      states: [
        { name: "IDLE", outputs: { done: 0 } },
        { name: "IDLE", outputs: { done: 1 } },
      ],
      transitions: [
        {
          from: "IDLE",
          to: "IDLE",
          when: { expr: "start" },
          outputs: {},
        },
      ],
    };

    render(<ControlledForm initialModel={initialModel} />);

    const messages = consoleError.mock.calls
      .flat()
      .map((message) => String(message));
    expect(messages).not.toEqual(
      expect.arrayContaining([
        expect.stringContaining("Encountered two children with the same key"),
      ]),
    );
  });
});
