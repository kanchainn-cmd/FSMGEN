export type HdlFlavor = "systemverilog" | "verilog2001";
export type ResetActive = "low" | "high";
export type ConditionOperator = "==" | "!=" | "<" | "<=" | ">" | ">=";

export interface ClockConfig {
  name: string;
  reset: string;
  reset_active: ResetActive;
}

export interface PortConfig {
  name: string;
  width: number;
}

export interface PortsConfig {
  inputs: PortConfig[];
  outputs: PortConfig[];
}

export interface RawCondition {
  expr: string;
}

export interface AtomicCondition {
  signal: string;
  op: ConditionOperator;
  value: string | number;
}

export interface AllCondition {
  all: Condition[];
}

export interface AnyCondition {
  any: Condition[];
}

export type Condition = RawCondition | AtomicCondition | AllCondition | AnyCondition;

export interface StateConfig {
  name: string;
  outputs: Record<string, string | number>;
}

export interface TransitionConfig {
  from: string;
  to: string;
  when: Condition;
  outputs: Record<string, string | number>;
}

export interface FsmModel {
  version: 1;
  module: string;
  flavor: HdlFlavor;
  mealy: boolean;
  clock: ClockConfig;
  ports: PortsConfig;
  states: StateConfig[];
  transitions: TransitionConfig[];
  initial: string;
}

export type FsmModelInput = Omit<FsmModel, "ports" | "states" | "transitions"> & {
  ports: {
    inputs?: Partial<PortConfig>[];
    outputs?: Partial<PortConfig>[];
  };
  states: Array<Pick<StateConfig, "name"> & Partial<StateConfig>>;
  transitions?: Array<
    Pick<TransitionConfig, "from" | "to" | "when"> & Partial<TransitionConfig>
  >;
};
