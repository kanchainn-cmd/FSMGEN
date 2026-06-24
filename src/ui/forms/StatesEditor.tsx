import { Field } from "../common/Field";
import type { FsmModel, StateConfig } from "../../core/schema/types";

function stateDisplayName(state: StateConfig, index: number): string {
  return state.name || `state ${index + 1}`;
}

export function StatesEditor({
  model,
  onChange,
}: {
  model: FsmModel;
  onChange: (model: FsmModel) => void;
}) {
  function updateState(index: number, nextState: StateConfig): void {
    onChange({
      ...model,
      states: model.states.map((state, stateIndex) =>
        stateIndex === index ? nextState : state,
      ),
    });
  }

  return (
    <fieldset>
      <legend>States</legend>
      {model.states.map((state, index) => (
        <div data-testid="state-row" key={`state-${index}`}>
          <Field label={`State ${index + 1} name`}>
            <input
              aria-label={`State ${index + 1} name`}
              value={state.name}
              onChange={(event) => {
                const nextName = event.target.value;
                onChange({
                  ...model,
                  initial: model.initial === state.name ? nextName : model.initial,
                  states: model.states.map((candidate, stateIndex) =>
                    stateIndex === index ? { ...candidate, name: nextName } : candidate,
                  ),
                });
              }}
            />
          </Field>
          <label>
            <input
              aria-label={`Initial state ${index + 1}`}
              checked={model.initial === state.name}
              name="initial-state"
              onChange={() => onChange({ ...model, initial: state.name })}
              type="radio"
            />
            <span>Initial</span>
          </label>
          {model.ports.outputs.map((port, outputIndex) => (
            <Field
              key={`state-${index}-output-${outputIndex}`}
              label={`Moore output ${port.name} for state ${index + 1} output ${
                outputIndex + 1
              }`}
            >
              <input
                aria-label={`Moore output ${port.name} for state ${
                  index + 1
                } output ${outputIndex + 1}`}
                title={`Moore output ${port.name} for ${stateDisplayName(
                  state,
                  index,
                )}`}
                value={String(state.outputs[port.name] ?? "")}
                onChange={(event) =>
                  updateState(index, {
                    ...state,
                    outputs: { ...state.outputs, [port.name]: event.target.value },
                  })
                }
              />
            </Field>
          ))}
        </div>
      ))}
      <button
        type="button"
        onClick={() =>
          onChange({
            ...model,
            states: [...model.states, { name: "", outputs: {} }],
          })
        }
      >
        Add state
      </button>
    </fieldset>
  );
}
