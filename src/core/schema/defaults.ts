import type {
  FsmModel,
  FsmModelInput,
  PortConfig,
  StateConfig,
  TransitionConfig,
} from "./types";

function normalizePort(port: Partial<PortConfig>): PortConfig {
  return {
    name: port.name ?? "",
    width: port.width ?? 1,
  };
}

function normalizeState(state: Pick<StateConfig, "name"> & Partial<StateConfig>): StateConfig {
  return {
    name: state.name,
    outputs: state.outputs ?? {},
  };
}

function normalizeTransition(
  transition: Pick<TransitionConfig, "from" | "to" | "when"> &
    Partial<TransitionConfig>,
): TransitionConfig {
  return {
    from: transition.from,
    to: transition.to,
    when: transition.when,
    outputs: transition.outputs ?? {},
  };
}

export function createDefaultModel(): FsmModel {
  return {
    version: 1,
    module: "fsm_controller",
    flavor: "systemverilog",
    mealy: false,
    clock: {
      name: "clk",
      reset: "rst_n",
      reset_active: "low",
    },
    ports: {
      inputs: [{ name: "start", width: 1 }],
      outputs: [{ name: "done", width: 1 }],
    },
    states: [{ name: "IDLE", outputs: { done: 0 } }],
    transitions: [],
    initial: "IDLE",
  };
}

export function normalizeModel(input: FsmModelInput): FsmModel {
  return {
    version: 1,
    module: input.module,
    flavor: input.flavor,
    mealy: input.mealy,
    clock: input.clock,
    ports: {
      inputs: (input.ports.inputs ?? []).map(normalizePort),
      outputs: (input.ports.outputs ?? []).map(normalizePort),
    },
    states: input.states.map(normalizeState),
    transitions: (input.transitions ?? []).map(normalizeTransition),
    initial: input.initial,
  };
}
