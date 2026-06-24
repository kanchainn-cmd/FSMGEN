import { useEffect, useState } from "react";
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

function parsePortWidth(value: string, currentWidth: number): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return Math.max(1, currentWidth);
  }

  return parsed;
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
            <PortWidthInput
              ariaLabel={`${label} port ${index + 1} width`}
              onChange={(width) =>
                onChange(updatePort(model, kind, index, { width }))
              }
              value={port.width}
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

function PortWidthInput({
  ariaLabel,
  value,
  onChange,
}: {
  ariaLabel: string;
  value: number;
  onChange: (width: number) => void;
}) {
  const [draftValue, setDraftValue] = useState(String(value));

  useEffect(() => {
    setDraftValue(String(value));
  }, [value]);

  return (
    <input
      aria-label={ariaLabel}
      min={1}
      type="number"
      value={draftValue}
      onChange={(event) => {
        const nextValue = event.target.value;
        setDraftValue(nextValue);

        if (nextValue === "") {
          return;
        }

        const nextWidth = parsePortWidth(nextValue, value);
        if (nextWidth !== value || nextValue !== String(nextWidth)) {
          onChange(nextWidth);
        }
      }}
      onBlur={() => setDraftValue(String(value))}
    />
  );
}
