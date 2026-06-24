import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
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
    await user.click(within(stateRows[2]).getByLabelText("Initial state"));
    await user.clear(within(stateRows[2]).getByLabelText("Moore output done for state DONE"));
    await user.type(within(stateRows[2]).getByLabelText("Moore output done for state DONE"), "1");
    await user.clear(within(stateRows[2]).getByLabelText("Moore output error for state DONE"));
    await user.type(within(stateRows[2]).getByLabelText("Moore output error for state DONE"), "0");

    const transitionRow = screen.getByTestId("transition-row-1");
    expect(within(transitionRow).getByLabelText("Condition expression")).toHaveValue(
      "(start == 1)",
    );
    await user.selectOptions(within(transitionRow).getByLabelText("Condition type"), "atomic");
    await user.clear(within(transitionRow).getByLabelText("Condition signal"));
    await user.type(within(transitionRow).getByLabelText("Condition signal"), "enable");
    await user.selectOptions(within(transitionRow).getByLabelText("Condition operator"), "!=");
    await user.clear(within(transitionRow).getByLabelText("Condition value"));
    await user.type(within(transitionRow).getByLabelText("Condition value"), "0");
    await user.clear(within(transitionRow).getByLabelText("Mealy output done for transition 1"));
    await user.type(within(transitionRow).getByLabelText("Mealy output done for transition 1"), "0");

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
});
