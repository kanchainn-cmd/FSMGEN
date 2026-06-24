import type { FsmModel } from "../../core/schema/types";
import { ModuleSettings } from "./ModuleSettings";
import { PortsEditor } from "./PortsEditor";
import { StatesEditor } from "./StatesEditor";
import { TransitionsEditor } from "./TransitionsEditor";

export function FsmForm({
  model,
  onChange,
}: {
  model: FsmModel;
  onChange: (model: FsmModel) => void;
}) {
  return (
    <form aria-label="FSM editor">
      <ModuleSettings model={model} onChange={onChange} />
      <PortsEditor model={model} onChange={onChange} />
      <StatesEditor model={model} onChange={onChange} />
      <TransitionsEditor model={model} onChange={onChange} />
    </form>
  );
}
