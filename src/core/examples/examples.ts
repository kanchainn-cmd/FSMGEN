export interface FsmExample {
  id: string;
  name: string;
  yaml: string;
}

export const examples: FsmExample[] = [
  {
    id: "traffic-light",
    name: "Moore traffic light",
    yaml: `version: 1
module: traffic_light
flavor: systemverilog
mealy: false
clock:
  name: clk
  reset: rst_n
  reset_active: low
ports:
  inputs:
    - name: timer_done
      width: 1
  outputs:
    - name: red
      width: 1
    - name: yellow
      width: 1
    - name: green
      width: 1
states:
  - name: RED
    outputs:
      red: 1
      yellow: 0
      green: 0
  - name: GREEN
    outputs:
      red: 0
      yellow: 0
      green: 1
transitions:
  - from: RED
    to: GREEN
    when:
      expr: timer_done
  - from: GREEN
    to: RED
    when:
      expr: timer_done
initial: RED
`,
  },
  {
    id: "sequence-detector",
    name: "Mealy sequence detector",
    yaml: `version: 1
module: sequence_detector
flavor: systemverilog
mealy: true
clock:
  name: clk
  reset: rst_n
  reset_active: low
ports:
  inputs:
    - name: bit_in
      width: 1
  outputs:
    - name: detected
      width: 1
states:
  - name: S0
    outputs:
      detected: 0
  - name: S1
    outputs:
      detected: 0
transitions:
  - from: S0
    to: S1
    when:
      expr: bit_in
  - from: S1
    to: S0
    when:
      expr: bit_in
    outputs:
      detected: 1
initial: S0
`,
  },
];
