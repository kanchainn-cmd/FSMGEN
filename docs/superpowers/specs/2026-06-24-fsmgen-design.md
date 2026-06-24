# FSMGEN GUI Design

Date: 2026-06-24

## Goal

Build a pure frontend static web tool for designing finite state machines and generating related hardware design artifacts.

The tool lets users configure an FSM through a GUI form builder, keep the equivalent YAML in sync, preview generated outputs, and export:

- SystemVerilog FSM
- Verilog-2001 FSM
- Mermaid state diagram
- State transition table
- Testbench skeleton

The first version prioritizes a clear model, reliable validation, and modular generators over broad HDL feature coverage.

## Delivery Model

FSMGEN is a static browser application. It must run without a backend so it can be opened locally or deployed to static hosting such as GitHub Pages.

All parsing, validation, preview generation, and file export happen in the browser.

## Primary UX

The GUI form builder is the primary editing surface. Users can add and edit:

- Module metadata
- Clock and reset settings
- Input and output ports
- States
- Moore outputs attached to states
- Transitions
- Structured transition conditions
- Optional Mealy outputs attached to transitions

The app also includes a YAML editor. Form edits update the YAML immediately. YAML edits update the form only after successful parsing and validation into the shared FSM model.

When YAML parsing fails, the app shows the YAML error and preserves the last valid model for the form and previews.

## Core Decisions

- Default FSM style is Moore.
- Mealy behavior can be enabled with a `mealy` setting.
- When Mealy is enabled, transitions may define output overrides.
- SystemVerilog and Verilog-2001 are both supported.
- SystemVerilog is the default HDL flavor.
- The first version uses automatic binary state encoding.
- YAML comments are not preserved during form-to-YAML synchronization.
- Conditions use a dual model: structured condition builder first, raw expression escape hatch when needed.

## Architecture

The app is split into small modules with explicit dependencies.

### `schema/`

Defines the FSM model, YAML schema shape, defaults, legal identifier rules, and supported enum values.

This layer has no dependency on the UI or generators.

### `parser/`

Converts between YAML text and the normalized FSM model.

Responsibilities:

- Parse YAML
- Serialize normalized model back to YAML
- Apply default values
- Preserve schema version
- Return line and column information for YAML syntax errors when available

### `validators/`

Checks semantic correctness before generation.

Validation rules include:

- Module, state, port, and signal identifiers must be legal HDL-style identifiers.
- Names must not conflict within incompatible namespaces.
- Initial state must exist.
- Transition source and target states must exist.
- Output assignments must reference declared output ports.
- Condition references should warn when they appear to reference undeclared signals.
- Mealy transition outputs are valid only when `mealy: true`.
- Structured conditions must use supported logical forms and operators.

Generators only receive a validated model.

### `conditions/`

Owns condition rendering and condition editing helpers.

The condition model supports structured rules and a raw expression mode:

```yaml
when:
  expr: start && ready
```

```yaml
when:
  all:
    - signal: start
      op: "=="
      value: 1
    - any:
        - signal: mode
          op: "=="
          value: 2'b01
        - signal: force
          op: "=="
          value: 1
```

Structured conditions render to Verilog expressions such as:

```verilog
(start == 1) && ((mode == 2'b01) || (force == 1))
```

The raw `expr` mode is treated as an advanced escape hatch. It is rendered as written and receives only basic validation.

### `generators/`

Each output format is implemented as a separate generator that accepts the same validated model.

Generators:

- `systemverilog`
- `verilog2001`
- `mermaid`
- `transition-table`
- `testbench`

### `ui/`

Contains React components, app state management, editor panes, preview panes, and export controls.

The UI must not contain HDL generation logic. It calls model update helpers, validators, and generators.

### `examples/`

Ships with example FSMs:

- Moore traffic light controller
- Mealy sequence detector
- Controller with default/fallback transitions

Examples are stored as YAML and loaded through the same parser and validator as user input.

## YAML Shape

Representative Moore FSM:

```yaml
version: 1
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
```

Representative Mealy transition output:

```yaml
mealy: true
transitions:
  - from: S1
    to: S2
    when:
      expr: in_bit
    outputs:
      detected: 1
```

## Generated Outputs

### SystemVerilog

The default output uses:

- `typedef enum logic`
- `always_ff` for the state register
- `always_comb` for next-state logic
- `always_comb` for output logic

Moore outputs are generated from state output assignments.

When Mealy is enabled, transition outputs are generated as condition-specific overrides in output logic. Output defaults are always emitted before conditional assignments to avoid inferred latches.

### Verilog-2001

The compatibility output uses:

- `localparam` state encodings
- `reg` state and next-state variables
- `always @(posedge clk or negedge rst_n)` or equivalent active-high reset form
- `always @(*)` combinational blocks

The first version uses automatic binary encoding.

### Mermaid

The state diagram includes:

- Initial arrow: `[*] --> INITIAL_STATE`
- One edge per transition
- Condition label rendered from the structured condition or raw expression

### State Transition Table

The preview is rendered as an HTML table. Markdown export is also supported.

Columns:

- From
- Condition
- To
- Moore Outputs
- Mealy Outputs, shown only when Mealy is enabled

### Testbench Skeleton

The generated testbench is a compilable starting point with:

- Timescale
- Clock generation
- Reset sequence
- DUT instance
- Input initialization
- Commented stimulus sections derived from transitions
- Clearly marked sections where users can add assertions and coverage checks

The skeleton does not attempt to automatically prove complete FSM behavior.

## State Synchronization

The app keeps one normalized FSM model as the source of truth.

Form edit flow:

1. User edits a form field.
2. UI dispatches a model update.
3. Draft model state is normalized.
4. YAML text is regenerated from the draft model.
5. Validators check semantic correctness.
6. If validation succeeds, the draft becomes the last valid model and previews are regenerated.
7. If validation fails, the form shows inline errors and previews keep using the previous valid model.

YAML edit flow:

1. User edits YAML text.
2. Parser attempts to parse the YAML.
3. If parsing fails, the YAML pane shows syntax errors and the app keeps the last valid model.
4. If parsing succeeds, validators check semantic correctness.
5. If validation succeeds, the parsed model replaces the current model and updates the form.
6. If validation fails, the UI shows structured validation errors and does not run generators.

## Error Handling

YAML syntax errors show line and column information when the parser provides it.

Validation errors are structured and actionable. Example:

```text
Transition 3 target state "DONE" does not exist.
```

Generation errors should be rare because generators receive only validated models. If a generator fails, the preview pane for that output shows the error without affecting other panes.

## Testing Strategy

Focus testing on pure logic modules. UI tests are limited to critical integration flows.

Required test coverage:

- YAML round trip from model to YAML and back.
- Moore example generation for SystemVerilog, Verilog-2001, Mermaid, transition table, and testbench.
- Mealy example generation with transition output overrides.
- Structured `all` and `any` conditions render correctly to Verilog expressions.
- Invalid state references produce validation errors.
- Duplicate names produce validation errors.
- Missing initial state produces validation errors.
- YAML parsing failure preserves the last valid model in app state.

## Out Of Scope For Version 1

- Full Verilog expression parsing
- YAML comment preservation
- One-hot or custom state encoding
- Automatic formal verification
- Automatic testbench stimulus generation with expected-state checking
- Backend project file integration
- Importing existing Verilog FSMs

## Acceptance Criteria

- User can build a Moore FSM through the form builder and see synchronized YAML.
- User can enable Mealy mode and attach outputs to transitions.
- User can edit YAML manually; valid YAML updates the form, invalid YAML does not destroy the last valid form state.
- User can preview all five generated artifacts.
- User can export generated files from the browser.
- Core generators are independent from UI components.
- Core parser, validator, condition renderer, and generators have focused automated tests.

## Repository Note

The current workspace directory is not a Git repository. This design document can be committed after the repository is initialized or moved into an existing Git repository.
