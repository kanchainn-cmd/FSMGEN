import { Field } from "../common/Field";
import type { FsmModel, HdlFlavor, ResetActive } from "../../core/schema/types";

export function ModuleSettings({
  model,
  onChange,
}: {
  model: FsmModel;
  onChange: (model: FsmModel) => void;
}) {
  return (
    <fieldset>
      <legend>Module settings</legend>
      <Field label="Module name">
        <input
          aria-label="Module name"
          value={model.module}
          onChange={(event) => onChange({ ...model, module: event.target.value })}
        />
      </Field>
      <Field label="HDL flavor">
        <select
          aria-label="HDL flavor"
          value={model.flavor}
          onChange={(event) =>
            onChange({ ...model, flavor: event.target.value as HdlFlavor })
          }
        >
          <option value="systemverilog">SystemVerilog</option>
          <option value="verilog2001">Verilog 2001</option>
        </select>
      </Field>
      <label>
        <input
          aria-label="Mealy machine"
          type="checkbox"
          checked={model.mealy}
          onChange={(event) => {
            const mealy = event.target.checked;
            onChange({
              ...model,
              mealy,
              transitions: mealy
                ? model.transitions
                : model.transitions.map((transition) => ({
                    ...transition,
                    outputs: {},
                  })),
            });
          }}
        />
        <span>Mealy machine</span>
      </label>
      <Field label="Clock signal">
        <input
          aria-label="Clock signal"
          value={model.clock.name}
          onChange={(event) =>
            onChange({ ...model, clock: { ...model.clock, name: event.target.value } })
          }
        />
      </Field>
      <Field label="Reset signal">
        <input
          aria-label="Reset signal"
          value={model.clock.reset}
          onChange={(event) =>
            onChange({ ...model, clock: { ...model.clock, reset: event.target.value } })
          }
        />
      </Field>
      <Field label="Reset polarity">
        <select
          aria-label="Reset polarity"
          value={model.clock.reset_active}
          onChange={(event) =>
            onChange({
              ...model,
              clock: { ...model.clock, reset_active: event.target.value as ResetActive },
            })
          }
        >
          <option value="low">Active low</option>
          <option value="high">Active high</option>
        </select>
      </Field>
    </fieldset>
  );
}
