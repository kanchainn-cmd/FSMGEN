import { Field } from "../common/Field";
import type { FsmModel, PortConfig } from "../../core/schema/types";

type PortKind = "inputs" | "outputs";

function updatePort(
  model: FsmModel,
  kind: PortKind,
  index: number,
  patch: Partial<PortConfig>,
): FsmModel {
  return {
    ...model,
    ports: {
      ...model.ports,
      [kind]: model.ports[kind].map((port, portIndex) =>
        portIndex === index ? { ...port, ...patch } : port,
      ),
    },
  };
}

function addPort(model: FsmModel, kind: PortKind): FsmModel {
  return {
    ...model,
    ports: {
      ...model.ports,
      [kind]: [...model.ports[kind], { name: "", width: 1 }],
    },
  };
}

export function PortsEditor({
  model,
  onChange,
}: {
  model: FsmModel;
  onChange: (model: FsmModel) => void;
}) {
  return (
    <fieldset>
      <legend>Ports</legend>
      <PortList kind="inputs" label="Input" model={model} onChange={onChange} />
      <PortList kind="outputs" label="Output" model={model} onChange={onChange} />
    </fieldset>
  );
}

function PortList({
  kind,
  label,
  model,
  onChange,
}: {
  kind: PortKind;
  label: "Input" | "Output";
  model: FsmModel;
  onChange: (model: FsmModel) => void;
}) {
  return (
    <section aria-label={`${label} ports`}>
      <h3>{label} ports</h3>
      {model.ports[kind].map((port, index) => (
        <div
          data-testid={`${label.toLowerCase()}-port-row`}
          key={`${kind}-${index}`}
        >
          <Field label={`${label} port ${index + 1} name`}>
            <input
              aria-label={`${label} port ${index + 1} name`}
              value={port.name}
              onChange={(event) =>
                onChange(updatePort(model, kind, index, { name: event.target.value }))
              }
            />
          </Field>
          <Field label={`${label} port ${index + 1} width`}>
            <input
              aria-label={`${label} port ${index + 1} width`}
              min={1}
              type="number"
              value={port.width || ""}
              onChange={(event) =>
                onChange(
                  updatePort(model, kind, index, {
                    width: Number.parseInt(event.target.value, 10) || 0,
                  }),
                )
              }
            />
          </Field>
        </div>
      ))}
      <button type="button" onClick={() => onChange(addPort(model, kind))}>
        Add {label.toLowerCase()} port
      </button>
    </section>
  );
}
