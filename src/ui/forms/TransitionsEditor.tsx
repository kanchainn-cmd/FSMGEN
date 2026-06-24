import { Field } from "../common/Field";
import type { FsmModel, TransitionConfig } from "../../core/schema/types";
import { ConditionEditor } from "./ConditionEditor";

function updateTransition(
  model: FsmModel,
  index: number,
  nextTransition: TransitionConfig,
): FsmModel {
  return {
    ...model,
    transitions: model.transitions.map((transition, transitionIndex) =>
      transitionIndex === index ? nextTransition : transition,
    ),
  };
}

function fallbackState(model: FsmModel): string {
  return model.initial || model.states[0]?.name || "";
}

export function TransitionsEditor({
  model,
  onChange,
}: {
  model: FsmModel;
  onChange: (model: FsmModel) => void;
}) {
  return (
    <fieldset>
      <legend>Transitions</legend>
      {model.transitions.map((transition, index) => (
        <div data-testid={`transition-row-${index + 1}`} key={`transition-${index}`}>
          <Field label={`Transition ${index + 1} from`}>
            <select
              aria-label={`Transition ${index + 1} from`}
              value={transition.from}
              onChange={(event) =>
                onChange(
                  updateTransition(model, index, {
                    ...transition,
                    from: event.target.value,
                  }),
                )
              }
            >
              {model.states.map((state, stateIndex) => (
                <option key={`from-${stateIndex}`} value={state.name}>
                  {state.name || "(unnamed)"}
                </option>
              ))}
            </select>
          </Field>
          <Field label={`Transition ${index + 1} to`}>
            <select
              aria-label={`Transition ${index + 1} to`}
              value={transition.to}
              onChange={(event) =>
                onChange(
                  updateTransition(model, index, {
                    ...transition,
                    to: event.target.value,
                  }),
                )
              }
            >
              {model.states.map((state, stateIndex) => (
                <option key={`to-${stateIndex}`} value={state.name}>
                  {state.name || "(unnamed)"}
                </option>
              ))}
            </select>
          </Field>
          <ConditionEditor
            condition={transition.when}
            onChange={(condition) =>
              onChange(
                updateTransition(model, index, {
                  ...transition,
                  when: condition,
                }),
              )
            }
          />
          {model.mealy &&
            model.ports.outputs.map((port, outputIndex) => (
              <Field
                key={`transition-${index}-output-${outputIndex}`}
                label={`Mealy output ${port.name} ${
                  outputIndex + 1
                } for transition ${index + 1}`}
              >
                <input
                  aria-label={`Mealy output ${port.name} ${
                    outputIndex + 1
                  } for transition ${index + 1}`}
                  value={String(transition.outputs[port.name] ?? "")}
                  onChange={(event) =>
                    onChange(
                      updateTransition(model, index, {
                        ...transition,
                        outputs: {
                          ...transition.outputs,
                          [port.name]: event.target.value,
                        },
                      }),
                    )
                  }
                />
              </Field>
            ))}
        </div>
      ))}
      <button
        type="button"
        onClick={() => {
          const stateName = fallbackState(model);
          onChange({
            ...model,
            transitions: [
              ...model.transitions,
              {
                from: stateName,
                to: stateName,
                when: { expr: "" },
                outputs: {},
              },
            ],
          });
        }}
      >
        Add transition
      </button>
    </fieldset>
  );
}
