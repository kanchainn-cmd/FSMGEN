# FSMGEN GUI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a static browser GUI that configures FSMs, synchronizes YAML, previews generated artifacts, and exports Verilog/SystemVerilog, Mermaid, tables, and a testbench skeleton.

**Architecture:** Use a Vite + React + TypeScript static app. Keep FSM schema, parser, validator, condition renderer, state synchronization, and generators as pure TypeScript modules under `src/core/`; React components under `src/ui/` only call those modules and never contain HDL generation logic.

**Tech Stack:** Vite, React, TypeScript, Vitest, React Testing Library, `yaml`, `jszip`, `file-saver`, `@codemirror/view`, `@codemirror/lang-yaml`, `lucide-react`.

---

## Scope Check

This plan implements the approved spec in one cohesive frontend app. The work is split by independent core modules and UI integration tasks, but each task produces working, testable software.

The current directory is not a Git repository. The first implementation task initializes Git before the first commit.

## Planned File Structure

- `package.json`: scripts and dependencies.
- `vite.config.ts`: Vite and Vitest configuration.
- `tsconfig.json`: TypeScript project config.
- `index.html`: static app entry.
- `src/main.tsx`: React mount.
- `src/App.tsx`: top-level layout and state wiring.
- `src/styles.css`: app styling.
- `src/core/schema/types.ts`: normalized FSM model and YAML-facing types.
- `src/core/schema/defaults.ts`: default model factory and normalization helpers.
- `src/core/examples/examples.ts`: built-in YAML examples.
- `src/core/conditions/renderCondition.ts`: condition to Verilog/display string.
- `src/core/conditions/inspectCondition.ts`: condition signal reference extraction.
- `src/core/parser/yamlCodec.ts`: YAML parse and serialize.
- `src/core/validators/validateModel.ts`: semantic validation.
- `src/core/state/appState.ts`: last-valid-model synchronization logic.
- `src/core/generators/systemverilog.ts`: SystemVerilog generator.
- `src/core/generators/verilog2001.ts`: Verilog-2001 generator.
- `src/core/generators/mermaid.ts`: Mermaid state diagram generator.
- `src/core/generators/transitionTable.ts`: HTML and Markdown transition table generator.
- `src/core/generators/testbench.ts`: testbench skeleton generator.
- `src/core/generators/index.ts`: combined generation facade.
- `src/core/export/exportZip.ts`: browser export helpers.
- `src/ui/forms/FsmForm.tsx`: form builder shell.
- `src/ui/forms/ModuleSettings.tsx`: module, flavor, Mealy, clock, reset settings.
- `src/ui/forms/PortsEditor.tsx`: input/output port editor.
- `src/ui/forms/StatesEditor.tsx`: states and Moore output editor.
- `src/ui/forms/TransitionsEditor.tsx`: transition and Mealy output editor.
- `src/ui/forms/ConditionEditor.tsx`: structured/raw condition editor.
- `src/ui/yaml/YamlEditor.tsx`: YAML editor.
- `src/ui/preview/PreviewTabs.tsx`: generated output preview tabs.
- `src/ui/preview/DiagnosticsPanel.tsx`: parser and validator diagnostics.
- `src/ui/export/ExportPanel.tsx`: file export controls.
- `src/ui/common/Field.tsx`: shared labeled input layout.
- `src/test/setup.ts`: React Testing Library setup.
- `src/**/*.test.ts`: core unit tests.
- `src/**/*.test.tsx`: UI integration tests.

---

### Task 1: Scaffold Static React App And Test Tooling

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/styles.css`
- Create: `src/test/setup.ts`
- Create: `.gitignore`

- [ ] **Step 1: Initialize Git**

Run:

```bash
git init
```

Expected: repository initialized with a `.git` directory.

- [ ] **Step 2: Create package and config files**

Create `package.json`:

```json
{
  "name": "fsmgen",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite --host 127.0.0.1",
    "build": "tsc -b && vite build",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "tsc -b --noEmit"
  },
  "dependencies": {
    "@codemirror/lang-yaml": "^6.1.2",
    "@codemirror/view": "^6.38.0",
    "@uiw/react-codemirror": "^4.23.13",
    "file-saver": "^2.0.5",
    "jszip": "^3.10.1",
    "lucide-react": "^0.468.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "yaml": "^2.5.1"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.0.1",
    "@testing-library/user-event": "^14.5.2",
    "@types/file-saver": "^2.0.7",
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@vitejs/plugin-react": "^4.3.3",
    "jsdom": "^25.0.1",
    "typescript": "^5.6.3",
    "vite": "^5.4.10",
    "vitest": "^2.1.4"
  }
}
```

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["DOM", "DOM.Iterable", "ES2020"],
    "allowJs": false,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "Node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx"
  },
  "include": ["src", "vite.config.ts"]
}
```

Create `vite.config.ts`:

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    globals: true,
  },
});
```

Create `.gitignore`:

```gitignore
node_modules
dist
coverage
.DS_Store
```

- [ ] **Step 3: Create initial app shell**

Create `index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>FSMGEN</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

Create `src/main.tsx`:

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

Create `src/App.tsx`:

```tsx
export function App() {
  return (
    <main className="app-shell">
      <section className="workspace">
        <h1>FSMGEN</h1>
        <p>Finite state machine generator</p>
      </section>
    </main>
  );
}
```

Create `src/styles.css`:

```css
:root {
  color: #172026;
  background: #f6f8fb;
  font-family:
    Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI",
    sans-serif;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
}

button,
input,
select,
textarea {
  font: inherit;
}

.app-shell {
  min-height: 100vh;
  padding: 24px;
}

.workspace {
  max-width: 1440px;
  margin: 0 auto;
}
```

Create `src/test/setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 4: Install dependencies**

Run:

```bash
npm install
```

Expected: `node_modules` and `package-lock.json` are created.

- [ ] **Step 5: Verify scaffold**

Run:

```bash
npm test
npm run build
```

Expected: tests complete with no test files, and the production build succeeds.

- [ ] **Step 6: Commit scaffold**

Run:

```bash
git add .
git commit -m "chore: scaffold fsmgen app"
```

Expected: first commit records the static app scaffold.

---

### Task 2: Define FSM Schema, Defaults, And Examples

**Files:**
- Create: `src/core/schema/types.ts`
- Create: `src/core/schema/defaults.ts`
- Create: `src/core/examples/examples.ts`
- Test: `src/core/schema/defaults.test.ts`

- [ ] **Step 1: Write failing tests for defaults**

Create `src/core/schema/defaults.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createDefaultModel, normalizeModel } from "./defaults";

describe("FSM schema defaults", () => {
  it("creates a valid Moore SystemVerilog starter model", () => {
    const model = createDefaultModel();

    expect(model.version).toBe(1);
    expect(model.module).toBe("fsm_controller");
    expect(model.flavor).toBe("systemverilog");
    expect(model.mealy).toBe(false);
    expect(model.initial).toBe("IDLE");
    expect(model.states.map((state) => state.name)).toEqual(["IDLE"]);
  });

  it("normalizes missing optional arrays and widths", () => {
    const model = normalizeModel({
      version: 1,
      module: "simple",
      flavor: "verilog2001",
      mealy: false,
      clock: { name: "clk", reset: "rst", reset_active: "high" },
      ports: {
        inputs: [{ name: "go" }],
        outputs: [{ name: "done" }],
      },
      states: [{ name: "IDLE" }],
      transitions: [],
      initial: "IDLE",
    });

    expect(model.ports.inputs[0].width).toBe(1);
    expect(model.ports.outputs[0].width).toBe(1);
    expect(model.states[0].outputs).toEqual({});
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
npm test -- src/core/schema/defaults.test.ts
```

Expected: FAIL because schema modules do not exist.

- [ ] **Step 3: Implement schema types**

Create `src/core/schema/types.ts`:

```ts
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
```

- [ ] **Step 4: Implement defaults and normalization**

Create `src/core/schema/defaults.ts`:

```ts
import type { FsmModel, FsmModelInput, PortConfig, StateConfig, TransitionConfig } from "./types";

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
  transition: Pick<TransitionConfig, "from" | "to" | "when"> & Partial<TransitionConfig>,
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
```

- [ ] **Step 5: Add example YAML fixtures**

Create `src/core/examples/examples.ts`:

```ts
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
```

- [ ] **Step 6: Run tests**

Run:

```bash
npm test -- src/core/schema/defaults.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit schema**

Run:

```bash
git add src/core/schema src/core/examples
git commit -m "feat: define fsm schema"
```

Expected: commit records schema, defaults, and examples.

---

### Task 3: Implement Condition Rendering And Inspection

**Files:**
- Create: `src/core/conditions/renderCondition.ts`
- Create: `src/core/conditions/inspectCondition.ts`
- Test: `src/core/conditions/renderCondition.test.ts`
- Test: `src/core/conditions/inspectCondition.test.ts`

- [ ] **Step 1: Write failing condition rendering tests**

Create `src/core/conditions/renderCondition.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { renderConditionForDisplay, renderConditionForVerilog } from "./renderCondition";

describe("condition rendering", () => {
  it("renders raw expressions unchanged", () => {
    expect(renderConditionForVerilog({ expr: "start && ready" })).toBe("start && ready");
  });

  it("renders nested structured conditions", () => {
    const rendered = renderConditionForVerilog({
      all: [
        { signal: "start", op: "==", value: 1 },
        {
          any: [
            { signal: "mode", op: "==", value: "2'b01" },
            { signal: "force", op: "==", value: 1 },
          ],
        },
      ],
    });

    expect(rendered).toBe("(start == 1) && ((mode == 2'b01) || (force == 1))");
  });

  it("renders display labels", () => {
    expect(renderConditionForDisplay({ signal: "done", op: "==", value: 1 })).toBe("done == 1");
  });
});
```

Create `src/core/conditions/inspectCondition.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { collectConditionSignals } from "./inspectCondition";

describe("condition inspection", () => {
  it("collects signal references from structured conditions", () => {
    const signals = collectConditionSignals({
      any: [
        { signal: "go", op: "==", value: 1 },
        { all: [{ signal: "ready", op: "!=", value: 0 }] },
      ],
    });

    expect(signals).toEqual(["go", "ready"]);
  });

  it("does not infer signal references from raw expressions", () => {
    expect(collectConditionSignals({ expr: "go && ready" })).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
npm test -- src/core/conditions
```

Expected: FAIL because condition modules do not exist.

- [ ] **Step 3: Implement condition rendering**

Create `src/core/conditions/renderCondition.ts`:

```ts
import type { Condition } from "../schema/types";

function valueToText(value: string | number): string {
  return String(value);
}

export function renderConditionForVerilog(condition: Condition): string {
  if ("expr" in condition) {
    return condition.expr;
  }

  if ("signal" in condition) {
    return `${condition.signal} ${condition.op} ${valueToText(condition.value)}`;
  }

  if ("all" in condition) {
    return condition.all.map((child) => `(${renderConditionForVerilog(child)})`).join(" && ");
  }

  return condition.any.map((child) => `(${renderConditionForVerilog(child)})`).join(" || ");
}

export function renderConditionForDisplay(condition: Condition): string {
  return renderConditionForVerilog(condition);
}
```

- [ ] **Step 4: Implement condition signal inspection**

Create `src/core/conditions/inspectCondition.ts`:

```ts
import type { Condition } from "../schema/types";

export function collectConditionSignals(condition: Condition): string[] {
  if ("expr" in condition) {
    return [];
  }

  if ("signal" in condition) {
    return [condition.signal];
  }

  const children = "all" in condition ? condition.all : condition.any;
  return children.flatMap(collectConditionSignals);
}
```

- [ ] **Step 5: Run tests**

Run:

```bash
npm test -- src/core/conditions
```

Expected: PASS.

- [ ] **Step 6: Commit conditions**

Run:

```bash
git add src/core/conditions
git commit -m "feat: add condition rendering"
```

Expected: commit records condition helpers and tests.

---

### Task 4: Implement YAML Parse And Serialize

**Files:**
- Create: `src/core/parser/yamlCodec.ts`
- Test: `src/core/parser/yamlCodec.test.ts`

- [ ] **Step 1: Write failing parser tests**

Create `src/core/parser/yamlCodec.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { parseFsmYaml, serializeFsmYaml } from "./yamlCodec";
import { createDefaultModel } from "../schema/defaults";

describe("YAML codec", () => {
  it("serializes and parses a model", () => {
    const model = createDefaultModel();
    const yaml = serializeFsmYaml(model);
    const parsed = parseFsmYaml(yaml);

    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.model).toEqual(model);
    }
  });

  it("returns a syntax diagnostic for invalid YAML", () => {
    const parsed = parseFsmYaml("version: 1\nmodule: [broken");

    expect(parsed.ok).toBe(false);
    if (!parsed.ok) {
      expect(parsed.diagnostic.message.length).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
npm test -- src/core/parser/yamlCodec.test.ts
```

Expected: FAIL because parser module does not exist.

- [ ] **Step 3: Implement YAML codec**

Create `src/core/parser/yamlCodec.ts`:

```ts
import { parseDocument, stringify } from "yaml";
import { normalizeModel } from "../schema/defaults";
import type { FsmModel, FsmModelInput } from "../schema/types";

export interface ParseDiagnostic {
  message: string;
  line?: number;
  column?: number;
}

export type ParseResult =
  | { ok: true; model: FsmModel }
  | { ok: false; diagnostic: ParseDiagnostic };

export function parseFsmYaml(text: string): ParseResult {
  const document = parseDocument(text, { prettyErrors: true });

  if (document.errors.length > 0) {
    const error = document.errors[0];
    const position = error.linePos?.[0];
    return {
      ok: false,
      diagnostic: {
        message: error.message,
        line: position?.line,
        column: position?.col,
      },
    };
  }

  const value = document.toJS() as FsmModelInput;

  try {
    return { ok: true, model: normalizeModel(value) };
  } catch (error) {
    return {
      ok: false,
      diagnostic: {
        message: error instanceof Error ? error.message : "Unable to normalize YAML",
      },
    };
  }
}

export function serializeFsmYaml(model: FsmModel): string {
  return stringify(model, {
    lineWidth: 0,
    singleQuote: false,
  });
}
```

- [ ] **Step 4: Run parser tests**

Run:

```bash
npm test -- src/core/parser/yamlCodec.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit parser**

Run:

```bash
git add src/core/parser
git commit -m "feat: add yaml codec"
```

Expected: commit records YAML parsing and serialization.

---

### Task 5: Implement Semantic Validation

**Files:**
- Create: `src/core/validators/validateModel.ts`
- Test: `src/core/validators/validateModel.test.ts`

- [ ] **Step 1: Write failing validation tests**

Create `src/core/validators/validateModel.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createDefaultModel } from "../schema/defaults";
import { validateModel } from "./validateModel";

describe("model validation", () => {
  it("accepts the default model", () => {
    expect(validateModel(createDefaultModel()).valid).toBe(true);
  });

  it("rejects a missing initial state", () => {
    const model = { ...createDefaultModel(), initial: "MISSING" };
    const result = validateModel(model);

    expect(result.valid).toBe(false);
    expect(result.errors[0].message).toContain("Initial state");
  });

  it("rejects transition targets that do not exist", () => {
    const model = {
      ...createDefaultModel(),
      transitions: [{ from: "IDLE", to: "DONE", when: { expr: "start" }, outputs: {} }],
    };

    const result = validateModel(model);

    expect(result.valid).toBe(false);
    expect(result.errors.some((error) => error.message.includes("DONE"))).toBe(true);
  });

  it("rejects Mealy outputs when Mealy mode is disabled", () => {
    const model = {
      ...createDefaultModel(),
      transitions: [{ from: "IDLE", to: "IDLE", when: { expr: "start" }, outputs: { done: 1 } }],
    };

    const result = validateModel(model);

    expect(result.valid).toBe(false);
    expect(result.errors.some((error) => error.message.includes("Mealy"))).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
npm test -- src/core/validators/validateModel.test.ts
```

Expected: FAIL because validator module does not exist.

- [ ] **Step 3: Implement semantic validator**

Create `src/core/validators/validateModel.ts`:

```ts
import { collectConditionSignals } from "../conditions/inspectCondition";
import type { Condition, FsmModel } from "../schema/types";

export interface ValidationIssue {
  path: string;
  message: string;
  severity: "error" | "warning";
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

const identifierPattern = /^[A-Za-z_][A-Za-z0-9_]*$/;

function isIdentifier(value: string): boolean {
  return identifierPattern.test(value);
}

function validateCondition(condition: Condition, path: string, issues: ValidationIssue[]): void {
  if ("expr" in condition) {
    if (condition.expr.trim().length === 0) {
      issues.push({ path, message: "Raw condition expression must not be empty.", severity: "error" });
    }
    return;
  }

  if ("signal" in condition) {
    if (!isIdentifier(condition.signal)) {
      issues.push({ path, message: `Condition signal "${condition.signal}" is not a legal identifier.`, severity: "error" });
    }
    return;
  }

  const children = "all" in condition ? condition.all : condition.any;
  if (children.length === 0) {
    issues.push({ path, message: "Condition group must contain at least one child condition.", severity: "error" });
  }
  children.forEach((child, index) => validateCondition(child, `${path}.${index}`, issues));
}

function pushDuplicateErrors(values: string[], label: string, path: string, issues: ValidationIssue[]): void {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) {
      issues.push({ path, message: `Duplicate ${label} name "${value}".`, severity: "error" });
    }
    seen.add(value);
  }
}

export function validateModel(model: FsmModel): ValidationResult {
  const issues: ValidationIssue[] = [];

  if (!isIdentifier(model.module)) {
    issues.push({ path: "module", message: `Module name "${model.module}" is not a legal identifier.`, severity: "error" });
  }

  for (const name of [model.clock.name, model.clock.reset]) {
    if (!isIdentifier(name)) {
      issues.push({ path: "clock", message: `Clock or reset name "${name}" is not a legal identifier.`, severity: "error" });
    }
  }

  const stateNames = model.states.map((state) => state.name);
  const inputNames = model.ports.inputs.map((port) => port.name);
  const outputNames = model.ports.outputs.map((port) => port.name);
  const outputNameSet = new Set(outputNames);
  const signalNameSet = new Set([...inputNames, ...outputNames, model.clock.name, model.clock.reset]);
  const stateNameSet = new Set(stateNames);

  pushDuplicateErrors(stateNames, "state", "states", issues);
  pushDuplicateErrors(inputNames, "input", "ports.inputs", issues);
  pushDuplicateErrors(outputNames, "output", "ports.outputs", issues);

  for (const state of model.states) {
    if (!isIdentifier(state.name)) {
      issues.push({ path: `states.${state.name}`, message: `State name "${state.name}" is not a legal identifier.`, severity: "error" });
    }
    for (const output of Object.keys(state.outputs)) {
      if (!outputNameSet.has(output)) {
        issues.push({ path: `states.${state.name}.outputs.${output}`, message: `Moore output "${output}" is not declared.`, severity: "error" });
      }
    }
  }

  if (!stateNameSet.has(model.initial)) {
    issues.push({ path: "initial", message: `Initial state "${model.initial}" does not exist.`, severity: "error" });
  }

  model.transitions.forEach((transition, index) => {
    if (!stateNameSet.has(transition.from)) {
      issues.push({ path: `transitions.${index}.from`, message: `Transition ${index + 1} source state "${transition.from}" does not exist.`, severity: "error" });
    }
    if (!stateNameSet.has(transition.to)) {
      issues.push({ path: `transitions.${index}.to`, message: `Transition ${index + 1} target state "${transition.to}" does not exist.`, severity: "error" });
    }

    validateCondition(transition.when, `transitions.${index}.when`, issues);

    for (const signal of collectConditionSignals(transition.when)) {
      if (!signalNameSet.has(signal)) {
        issues.push({ path: `transitions.${index}.when`, message: `Condition references undeclared signal "${signal}".`, severity: "warning" });
      }
    }

    const transitionOutputs = Object.keys(transition.outputs);
    if (!model.mealy && transitionOutputs.length > 0) {
      issues.push({ path: `transitions.${index}.outputs`, message: "Mealy transition outputs require mealy: true.", severity: "error" });
    }
    for (const output of transitionOutputs) {
      if (!outputNameSet.has(output)) {
        issues.push({ path: `transitions.${index}.outputs.${output}`, message: `Mealy output "${output}" is not declared.`, severity: "error" });
      }
    }
  });

  const errors = issues.filter((issue) => issue.severity === "error");
  const warnings = issues.filter((issue) => issue.severity === "warning");

  return { valid: errors.length === 0, errors, warnings };
}
```

- [ ] **Step 4: Run validation tests**

Run:

```bash
npm test -- src/core/validators/validateModel.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit validator**

Run:

```bash
git add src/core/validators
git commit -m "feat: validate fsm models"
```

Expected: commit records validator and tests.

---

### Task 6: Implement App State Synchronization

**Files:**
- Create: `src/core/state/appState.ts`
- Test: `src/core/state/appState.test.ts`

- [ ] **Step 1: Write failing synchronization tests**

Create `src/core/state/appState.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createInitialAppState, updateDraftModel, updateYamlText } from "./appState";

describe("app state synchronization", () => {
  it("keeps YAML synchronized from model edits", () => {
    const state = createInitialAppState();
    const next = updateDraftModel(state, { ...state.draftModel, module: "renamed_fsm" });

    expect(next.yamlText).toContain("module: renamed_fsm");
    expect(next.lastValidModel.module).toBe("renamed_fsm");
  });

  it("preserves last valid model when YAML has syntax errors", () => {
    const state = createInitialAppState();
    const next = updateYamlText(state, "version: 1\nmodule: [broken");

    expect(next.parseDiagnostic).not.toBeNull();
    expect(next.lastValidModel).toEqual(state.lastValidModel);
  });

  it("does not promote semantically invalid YAML to last valid model", () => {
    const state = createInitialAppState();
    const next = updateYamlText(
      state,
      state.yamlText.replace("initial: IDLE", "initial: MISSING"),
    );

    expect(next.validation.errors.length).toBeGreaterThan(0);
    expect(next.lastValidModel.initial).toBe("IDLE");
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
npm test -- src/core/state/appState.test.ts
```

Expected: FAIL because app state module does not exist.

- [ ] **Step 3: Implement state synchronization**

Create `src/core/state/appState.ts`:

```ts
import { createDefaultModel } from "../schema/defaults";
import type { FsmModel } from "../schema/types";
import { parseFsmYaml, serializeFsmYaml, type ParseDiagnostic } from "../parser/yamlCodec";
import { validateModel, type ValidationResult } from "../validators/validateModel";

export interface FsmAppState {
  draftModel: FsmModel;
  lastValidModel: FsmModel;
  yamlText: string;
  parseDiagnostic: ParseDiagnostic | null;
  validation: ValidationResult;
}

export function createInitialAppState(): FsmAppState {
  const model = createDefaultModel();
  return {
    draftModel: model,
    lastValidModel: model,
    yamlText: serializeFsmYaml(model),
    parseDiagnostic: null,
    validation: validateModel(model),
  };
}

export function updateDraftModel(state: FsmAppState, draftModel: FsmModel): FsmAppState {
  const validation = validateModel(draftModel);
  return {
    ...state,
    draftModel,
    lastValidModel: validation.valid ? draftModel : state.lastValidModel,
    yamlText: serializeFsmYaml(draftModel),
    parseDiagnostic: null,
    validation,
  };
}

export function updateYamlText(state: FsmAppState, yamlText: string): FsmAppState {
  const parsed = parseFsmYaml(yamlText);

  if (!parsed.ok) {
    return {
      ...state,
      yamlText,
      parseDiagnostic: parsed.diagnostic,
    };
  }

  const validation = validateModel(parsed.model);

  return {
    ...state,
    draftModel: parsed.model,
    lastValidModel: validation.valid ? parsed.model : state.lastValidModel,
    yamlText,
    parseDiagnostic: null,
    validation,
  };
}
```

- [ ] **Step 4: Run synchronization tests**

Run:

```bash
npm test -- src/core/state/appState.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit app state**

Run:

```bash
git add src/core/state
git commit -m "feat: synchronize fsm yaml state"
```

Expected: commit records state synchronization.

---

### Task 7: Generate SystemVerilog FSM

**Files:**
- Create: `src/core/generators/systemverilog.ts`
- Test: `src/core/generators/systemverilog.test.ts`

- [ ] **Step 1: Write failing SystemVerilog tests**

Create `src/core/generators/systemverilog.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createDefaultModel } from "../schema/defaults";
import { generateSystemVerilog } from "./systemverilog";

describe("SystemVerilog generator", () => {
  it("generates a three-block FSM with enum states", () => {
    const code = generateSystemVerilog({
      ...createDefaultModel(),
      states: [
        { name: "IDLE", outputs: { done: 0 } },
        { name: "DONE", outputs: { done: 1 } },
      ],
      transitions: [{ from: "IDLE", to: "DONE", when: { expr: "start" }, outputs: {} }],
      initial: "IDLE",
    });

    expect(code).toContain("typedef enum logic");
    expect(code).toContain("always_ff @(posedge clk or negedge rst_n)");
    expect(code).toContain("always_comb begin");
    expect(code).toContain("if (start) next_state = DONE;");
    expect(code).toContain("done = 1;");
  });

  it("generates Mealy output overrides", () => {
    const model = {
      ...createDefaultModel(),
      mealy: true,
      transitions: [{ from: "IDLE", to: "IDLE", when: { expr: "start" }, outputs: { done: 1 } }],
    };

    const code = generateSystemVerilog(model);

    expect(code).toContain("if (start) begin");
    expect(code).toContain("done = 1;");
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
npm test -- src/core/generators/systemverilog.test.ts
```

Expected: FAIL because generator does not exist.

- [ ] **Step 3: Implement SystemVerilog generator**

Create `src/core/generators/systemverilog.ts`:

```ts
import { renderConditionForVerilog } from "../conditions/renderCondition";
import type { FsmModel, PortConfig, StateConfig } from "../schema/types";

function portDecl(direction: "input" | "output", port: PortConfig): string {
  const width = port.width > 1 ? ` logic [${port.width - 1}:0]` : " logic";
  return `  ${direction}${width} ${port.name}`;
}

function stateBits(count: number): number {
  return Math.max(1, Math.ceil(Math.log2(Math.max(count, 2))));
}

function assignmentLines(outputs: Record<string, string | number>, indent: string): string[] {
  return Object.entries(outputs).map(([name, value]) => `${indent}${name} = ${value};`);
}

function defaultOutputLines(model: FsmModel): string[] {
  return model.ports.outputs.map((port) => `  ${port.name} = '0;`);
}

function stateOutputLines(state: StateConfig): string[] {
  return assignmentLines(state.outputs, "        ");
}

export function generateSystemVerilog(model: FsmModel): string {
  const bits = stateBits(model.states.length);
  const ports = [
    portDecl("input", { name: model.clock.name, width: 1 }),
    portDecl("input", { name: model.clock.reset, width: 1 }),
    ...model.ports.inputs.map((port) => portDecl("input", port)),
    ...model.ports.outputs.map((port) => portDecl("output", port)),
  ].join(",\n");

  const enumStates = model.states.map((state) => state.name).join(", ");
  const resetCondition = model.clock.reset_active === "low" ? `!${model.clock.reset}` : model.clock.reset;
  const resetEdge = model.clock.reset_active === "low" ? `negedge ${model.clock.reset}` : `posedge ${model.clock.reset}`;

  const nextStateCases = model.states.flatMap((state) => {
    const transitions = model.transitions.filter((transition) => transition.from === state.name);
    const lines = [`      ${state.name}: begin`];
    for (const transition of transitions) {
      lines.push(`        if (${renderConditionForVerilog(transition.when)}) next_state = ${transition.to};`);
    }
    lines.push("      end");
    return lines;
  });

  const outputCases = model.states.flatMap((state) => {
    const lines = [`      ${state.name}: begin`, ...stateOutputLines(state)];
    if (model.mealy) {
      for (const transition of model.transitions.filter((item) => item.from === state.name && Object.keys(item.outputs).length > 0)) {
        lines.push(`        if (${renderConditionForVerilog(transition.when)}) begin`);
        lines.push(...assignmentLines(transition.outputs, "          "));
        lines.push("        end");
      }
    }
    lines.push("      end");
    return lines;
  });

  return `module ${model.module} (
${ports}
);

  typedef enum logic [${bits - 1}:0] { ${enumStates} } state_t;

  state_t state, next_state;

  always_ff @(posedge ${model.clock.name} or ${resetEdge}) begin
    if (${resetCondition}) state <= ${model.initial};
    else state <= next_state;
  end

  always_comb begin
    next_state = state;
    unique case (state)
${nextStateCases.join("\n")}
      default: next_state = ${model.initial};
    endcase
  end

  always_comb begin
${defaultOutputLines(model).join("\n")}
    unique case (state)
${outputCases.join("\n")}
      default: begin
      end
    endcase
  end

endmodule
`;
}
```

- [ ] **Step 4: Run SystemVerilog tests**

Run:

```bash
npm test -- src/core/generators/systemverilog.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit SystemVerilog generator**

Run:

```bash
git add src/core/generators/systemverilog.ts src/core/generators/systemverilog.test.ts
git commit -m "feat: generate systemverilog fsm"
```

Expected: commit records SystemVerilog generation.

---

### Task 8: Generate Verilog-2001 FSM

**Files:**
- Create: `src/core/generators/verilog2001.ts`
- Test: `src/core/generators/verilog2001.test.ts`

- [ ] **Step 1: Write failing Verilog-2001 tests**

Create `src/core/generators/verilog2001.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createDefaultModel } from "../schema/defaults";
import { generateVerilog2001 } from "./verilog2001";

describe("Verilog-2001 generator", () => {
  it("generates localparam state encodings", () => {
    const code = generateVerilog2001({
      ...createDefaultModel(),
      states: [
        { name: "IDLE", outputs: { done: 0 } },
        { name: "DONE", outputs: { done: 1 } },
      ],
      transitions: [{ from: "IDLE", to: "DONE", when: { expr: "start" }, outputs: {} }],
      initial: "IDLE",
    });

    expect(code).toContain("localparam IDLE = 1'd0;");
    expect(code).toContain("reg [0:0] state, next_state;");
    expect(code).toContain("always @(posedge clk or negedge rst_n)");
    expect(code).toContain("if (start) next_state = DONE;");
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
npm test -- src/core/generators/verilog2001.test.ts
```

Expected: FAIL because generator does not exist.

- [ ] **Step 3: Implement Verilog-2001 generator**

Create `src/core/generators/verilog2001.ts`:

```ts
import { renderConditionForVerilog } from "../conditions/renderCondition";
import type { FsmModel, PortConfig, StateConfig } from "../schema/types";

function stateBits(count: number): number {
  return Math.max(1, Math.ceil(Math.log2(Math.max(count, 2))));
}

function portDecl(direction: "input" | "output", port: PortConfig): string {
  const width = port.width > 1 ? ` [${port.width - 1}:0]` : "";
  const kind = direction === "output" ? "output reg" : "input";
  return `  ${kind}${width} ${port.name}`;
}

function assignmentLines(outputs: Record<string, string | number>, indent: string): string[] {
  return Object.entries(outputs).map(([name, value]) => `${indent}${name} = ${value};`);
}

function stateOutputLines(state: StateConfig): string[] {
  return assignmentLines(state.outputs, "        ");
}

export function generateVerilog2001(model: FsmModel): string {
  const bits = stateBits(model.states.length);
  const ports = [
    portDecl("input", { name: model.clock.name, width: 1 }),
    portDecl("input", { name: model.clock.reset, width: 1 }),
    ...model.ports.inputs.map((port) => portDecl("input", port)),
    ...model.ports.outputs.map((port) => portDecl("output", port)),
  ].join(",\n");

  const stateParams = model.states
    .map((state, index) => `  localparam ${state.name} = ${bits}'d${index};`)
    .join("\n");
  const resetCondition = model.clock.reset_active === "low" ? `!${model.clock.reset}` : model.clock.reset;
  const resetEdge = model.clock.reset_active === "low" ? `negedge ${model.clock.reset}` : `posedge ${model.clock.reset}`;

  const nextStateCases = model.states.flatMap((state) => {
    const lines = [`      ${state.name}: begin`];
    for (const transition of model.transitions.filter((item) => item.from === state.name)) {
      lines.push(`        if (${renderConditionForVerilog(transition.when)}) next_state = ${transition.to};`);
    }
    lines.push("      end");
    return lines;
  });

  const outputCases = model.states.flatMap((state) => {
    const lines = [`      ${state.name}: begin`, ...stateOutputLines(state)];
    if (model.mealy) {
      for (const transition of model.transitions.filter((item) => item.from === state.name && Object.keys(item.outputs).length > 0)) {
        lines.push(`        if (${renderConditionForVerilog(transition.when)}) begin`);
        lines.push(...assignmentLines(transition.outputs, "          "));
        lines.push("        end");
      }
    }
    lines.push("      end");
    return lines;
  });

  return `module ${model.module} (
${ports}
);

${stateParams}

  reg [${bits - 1}:0] state, next_state;

  always @(posedge ${model.clock.name} or ${resetEdge}) begin
    if (${resetCondition}) state <= ${model.initial};
    else state <= next_state;
  end

  always @(*) begin
    next_state = state;
    case (state)
${nextStateCases.join("\n")}
      default: next_state = ${model.initial};
    endcase
  end

  always @(*) begin
${model.ports.outputs.map((port) => `    ${port.name} = 0;`).join("\n")}
    case (state)
${outputCases.join("\n")}
      default: begin
      end
    endcase
  end

endmodule
`;
}
```

- [ ] **Step 4: Run Verilog-2001 tests**

Run:

```bash
npm test -- src/core/generators/verilog2001.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit Verilog-2001 generator**

Run:

```bash
git add src/core/generators/verilog2001.ts src/core/generators/verilog2001.test.ts
git commit -m "feat: generate verilog 2001 fsm"
```

Expected: commit records Verilog-2001 generation.

---

### Task 9: Generate Mermaid, Transition Tables, Testbench, And Facade

**Files:**
- Create: `src/core/generators/mermaid.ts`
- Create: `src/core/generators/transitionTable.ts`
- Create: `src/core/generators/testbench.ts`
- Create: `src/core/generators/index.ts`
- Test: `src/core/generators/supportingOutputs.test.ts`

- [ ] **Step 1: Write failing tests for supporting outputs**

Create `src/core/generators/supportingOutputs.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createDefaultModel } from "../schema/defaults";
import { generateAllArtifacts } from "./index";
import { generateMermaid } from "./mermaid";
import { generateTestbench } from "./testbench";
import { generateTransitionTableMarkdown } from "./transitionTable";

describe("supporting generators", () => {
  const model = {
    ...createDefaultModel(),
    states: [
      { name: "IDLE", outputs: { done: 0 } },
      { name: "DONE", outputs: { done: 1 } },
    ],
    transitions: [{ from: "IDLE", to: "DONE", when: { expr: "start" }, outputs: {} }],
    initial: "IDLE",
  };

  it("generates Mermaid state diagram text", () => {
    expect(generateMermaid(model)).toContain("[*] --> IDLE");
    expect(generateMermaid(model)).toContain("IDLE --> DONE : start");
  });

  it("generates Markdown transition table", () => {
    const markdown = generateTransitionTableMarkdown(model);

    expect(markdown).toContain("| From | Condition | To | Moore Outputs |");
    expect(markdown).toContain("| IDLE | start | DONE |");
  });

  it("generates testbench skeleton", () => {
    const testbench = generateTestbench(model);

    expect(testbench).toContain("module fsm_controller_tb;");
    expect(testbench).toContain("fsm_controller dut");
    expect(testbench).toContain("Add assertions and coverage checks in this section.");
  });

  it("generates all artifacts through the facade", () => {
    const artifacts = generateAllArtifacts(model);

    expect(artifacts.systemverilog.filename).toBe("fsm_controller.sv");
    expect(artifacts.verilog2001.filename).toBe("fsm_controller.v");
    expect(artifacts.mermaid.filename).toBe("fsm_controller.mmd");
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
npm test -- src/core/generators/supportingOutputs.test.ts
```

Expected: FAIL because supporting generators do not exist.

- [ ] **Step 3: Implement Mermaid generator**

Create `src/core/generators/mermaid.ts`:

```ts
import { renderConditionForDisplay } from "../conditions/renderCondition";
import type { FsmModel } from "../schema/types";

export function generateMermaid(model: FsmModel): string {
  const lines = ["stateDiagram-v2", `  [*] --> ${model.initial}`];

  for (const transition of model.transitions) {
    lines.push(`  ${transition.from} --> ${transition.to} : ${renderConditionForDisplay(transition.when)}`);
  }

  return `${lines.join("\n")}\n`;
}
```

- [ ] **Step 4: Implement transition table generator**

Create `src/core/generators/transitionTable.ts`:

```ts
import { renderConditionForDisplay } from "../conditions/renderCondition";
import type { FsmModel } from "../schema/types";

function outputText(outputs: Record<string, string | number>): string {
  const entries = Object.entries(outputs);
  if (entries.length === 0) {
    return "-";
  }
  return entries.map(([name, value]) => `${name}=${value}`).join(", ");
}

export function generateTransitionTableMarkdown(model: FsmModel): string {
  const headers = model.mealy
    ? ["From", "Condition", "To", "Moore Outputs", "Mealy Outputs"]
    : ["From", "Condition", "To", "Moore Outputs"];
  const divider = headers.map(() => "---");
  const stateOutputs = new Map(model.states.map((state) => [state.name, state.outputs]));
  const rows = model.transitions.map((transition) => {
    const base = [
      transition.from,
      renderConditionForDisplay(transition.when),
      transition.to,
      outputText(stateOutputs.get(transition.from) ?? {}),
    ];
    if (model.mealy) {
      base.push(outputText(transition.outputs));
    }
    return `| ${base.join(" | ")} |`;
  });

  return [`| ${headers.join(" | ")} |`, `| ${divider.join(" | ")} |`, ...rows].join("\n");
}

export function generateTransitionTableHtml(model: FsmModel): string {
  const markdown = generateTransitionTableMarkdown(model);
  const lines = markdown.split("\n");
  const headers = lines[0]
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);
  const rows = lines.slice(2).map((line) =>
    line
      .split("|")
      .map((item) => item.trim())
      .filter(Boolean),
  );

  return `<table><thead><tr>${headers.map((header) => `<th>${header}</th>`).join("")}</tr></thead><tbody>${rows
    .map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`)
    .join("")}</tbody></table>`;
}
```

- [ ] **Step 5: Implement testbench generator and facade**

Create `src/core/generators/testbench.ts`:

```ts
import type { FsmModel, PortConfig } from "../schema/types";

function signalDecl(port: PortConfig): string {
  const width = port.width > 1 ? ` [${port.width - 1}:0]` : "";
  return `  logic${width} ${port.name};`;
}

export function generateTestbench(model: FsmModel): string {
  const inputDecls = model.ports.inputs.map(signalDecl).join("\n");
  const outputDecls = model.ports.outputs.map(signalDecl).join("\n");
  const connections = [
    `    .${model.clock.name}(${model.clock.name})`,
    `    .${model.clock.reset}(${model.clock.reset})`,
    ...model.ports.inputs.map((port) => `    .${port.name}(${port.name})`),
    ...model.ports.outputs.map((port) => `    .${port.name}(${port.name})`),
  ].join(",\n");
  const inactiveReset = model.clock.reset_active === "low" ? "1'b1" : "1'b0";
  const activeReset = model.clock.reset_active === "low" ? "1'b0" : "1'b1";
  const stimulusComments = model.transitions
    .map((transition) => `    // Drive condition for ${transition.from} -> ${transition.to}.`)
    .join("\n");

  return `\`timescale 1ns/1ps

module ${model.module}_tb;
  logic ${model.clock.name};
  logic ${model.clock.reset};
${inputDecls}
${outputDecls}

  ${model.module} dut (
${connections}
  );

  initial begin
    ${model.clock.name} = 1'b0;
    forever #5 ${model.clock.name} = ~${model.clock.name};
  end

  initial begin
    ${model.clock.reset} = ${activeReset};
${model.ports.inputs.map((port) => `    ${port.name} = '0;`).join("\n")}
    repeat (2) @(posedge ${model.clock.name});
    ${model.clock.reset} = ${inactiveReset};

${stimulusComments}

    // Add assertions and coverage checks in this section.
    repeat (4) @(posedge ${model.clock.name});
    $finish;
  end
endmodule
`;
}
```

Create `src/core/generators/index.ts`:

```ts
import type { FsmModel } from "../schema/types";
import { generateMermaid } from "./mermaid";
import { generateSystemVerilog } from "./systemverilog";
import { generateTestbench } from "./testbench";
import { generateTransitionTableMarkdown } from "./transitionTable";
import { generateVerilog2001 } from "./verilog2001";

export interface GeneratedArtifact {
  filename: string;
  content: string;
  language: "systemverilog" | "verilog" | "mermaid" | "markdown";
}

export interface GeneratedArtifacts {
  systemverilog: GeneratedArtifact;
  verilog2001: GeneratedArtifact;
  mermaid: GeneratedArtifact;
  transitionTable: GeneratedArtifact;
  testbench: GeneratedArtifact;
}

export function generateAllArtifacts(model: FsmModel): GeneratedArtifacts {
  return {
    systemverilog: {
      filename: `${model.module}.sv`,
      content: generateSystemVerilog(model),
      language: "systemverilog",
    },
    verilog2001: {
      filename: `${model.module}.v`,
      content: generateVerilog2001(model),
      language: "verilog",
    },
    mermaid: {
      filename: `${model.module}.mmd`,
      content: generateMermaid(model),
      language: "mermaid",
    },
    transitionTable: {
      filename: `${model.module}_transitions.md`,
      content: generateTransitionTableMarkdown(model),
      language: "markdown",
    },
    testbench: {
      filename: `${model.module}_tb.sv`,
      content: generateTestbench(model),
      language: "systemverilog",
    },
  };
}
```

- [ ] **Step 6: Run supporting generator tests**

Run:

```bash
npm test -- src/core/generators
```

Expected: PASS.

- [ ] **Step 7: Commit supporting generators**

Run:

```bash
git add src/core/generators
git commit -m "feat: generate fsm companion artifacts"
```

Expected: commit records Mermaid, table, testbench, and facade generation.

---

### Task 10: Implement Browser Export Helpers

**Files:**
- Create: `src/core/export/exportZip.ts`
- Test: `src/core/export/exportZip.test.ts`

- [ ] **Step 1: Write failing export tests**

Create `src/core/export/exportZip.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildArtifactZipBlob } from "./exportZip";

describe("artifact zip export", () => {
  it("creates a zip blob from artifact contents", async () => {
    const blob = await buildArtifactZipBlob([
      { filename: "fsm.sv", content: "module fsm; endmodule" },
      { filename: "fsm.mmd", content: "stateDiagram-v2" },
    ]);

    expect(blob.size).toBeGreaterThan(0);
    expect(blob.type).toBe("application/zip");
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
npm test -- src/core/export/exportZip.test.ts
```

Expected: FAIL because export module does not exist.

- [ ] **Step 3: Implement export helper**

Create `src/core/export/exportZip.ts`:

```ts
import { saveAs } from "file-saver";
import JSZip from "jszip";

export interface ExportableArtifact {
  filename: string;
  content: string;
}

export async function buildArtifactZipBlob(artifacts: ExportableArtifact[]): Promise<Blob> {
  const zip = new JSZip();
  for (const artifact of artifacts) {
    zip.file(artifact.filename, artifact.content);
  }
  return zip.generateAsync({ type: "blob", mimeType: "application/zip" });
}

export async function downloadArtifactsZip(
  artifacts: ExportableArtifact[],
  filename: string,
): Promise<void> {
  const blob = await buildArtifactZipBlob(artifacts);
  saveAs(blob, filename);
}

export function downloadTextArtifact(artifact: ExportableArtifact): void {
  const blob = new Blob([artifact.content], { type: "text/plain;charset=utf-8" });
  saveAs(blob, artifact.filename);
}
```

- [ ] **Step 4: Run export tests**

Run:

```bash
npm test -- src/core/export/exportZip.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit export helpers**

Run:

```bash
git add src/core/export
git commit -m "feat: export generated artifacts"
```

Expected: commit records browser export helpers.

---

### Task 11: Build Form Editor Components

**Files:**
- Create: `src/ui/common/Field.tsx`
- Create: `src/ui/forms/FsmForm.tsx`
- Create: `src/ui/forms/ModuleSettings.tsx`
- Create: `src/ui/forms/PortsEditor.tsx`
- Create: `src/ui/forms/StatesEditor.tsx`
- Create: `src/ui/forms/TransitionsEditor.tsx`
- Create: `src/ui/forms/ConditionEditor.tsx`
- Test: `src/ui/forms/FsmForm.test.tsx`

- [ ] **Step 1: Write failing form integration test**

Create `src/ui/forms/FsmForm.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { createDefaultModel } from "../../core/schema/defaults";
import { FsmForm } from "./FsmForm";

describe("FSM form", () => {
  it("edits module name and toggles Mealy mode", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<FsmForm model={createDefaultModel()} onChange={onChange} />);

    await user.clear(screen.getByLabelText("Module name"));
    await user.type(screen.getByLabelText("Module name"), "renamed_fsm");
    await user.click(screen.getByLabelText("Enable Mealy outputs"));

    expect(onChange).toHaveBeenCalled();
    expect(onChange.mock.calls.at(-1)?.[0].mealy).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run:

```bash
npm test -- src/ui/forms/FsmForm.test.tsx
```

Expected: FAIL because form components do not exist.

- [ ] **Step 3: Implement shared field and module settings**

Create `src/ui/common/Field.tsx`:

```tsx
import type { ReactNode } from "react";

interface FieldProps {
  label: string;
  children: ReactNode;
}

export function Field({ label, children }: FieldProps) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}
```

Create `src/ui/forms/ModuleSettings.tsx`:

```tsx
import type { FsmModel, HdlFlavor, ResetActive } from "../../core/schema/types";
import { Field } from "../common/Field";

interface ModuleSettingsProps {
  model: FsmModel;
  onChange: (model: FsmModel) => void;
}

export function ModuleSettings({ model, onChange }: ModuleSettingsProps) {
  return (
    <section className="panel">
      <h2>Module</h2>
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
          onChange={(event) => onChange({ ...model, flavor: event.target.value as HdlFlavor })}
        >
          <option value="systemverilog">SystemVerilog</option>
          <option value="verilog2001">Verilog-2001</option>
        </select>
      </Field>
      <label className="checkbox-row">
        <input
          aria-label="Enable Mealy outputs"
          type="checkbox"
          checked={model.mealy}
          onChange={(event) => onChange({ ...model, mealy: event.target.checked })}
        />
        <span>Enable Mealy outputs</span>
      </label>
      <Field label="Clock">
        <input
          aria-label="Clock"
          value={model.clock.name}
          onChange={(event) => onChange({ ...model, clock: { ...model.clock, name: event.target.value } })}
        />
      </Field>
      <Field label="Reset">
        <input
          aria-label="Reset"
          value={model.clock.reset}
          onChange={(event) => onChange({ ...model, clock: { ...model.clock, reset: event.target.value } })}
        />
      </Field>
      <Field label="Reset active">
        <select
          aria-label="Reset active"
          value={model.clock.reset_active}
          onChange={(event) =>
            onChange({ ...model, clock: { ...model.clock, reset_active: event.target.value as ResetActive } })
          }
        >
          <option value="low">Low</option>
          <option value="high">High</option>
        </select>
      </Field>
    </section>
  );
}
```

- [ ] **Step 4: Implement remaining form components**

Create `src/ui/forms/PortsEditor.tsx`:

```tsx
import type { FsmModel, PortConfig } from "../../core/schema/types";

interface PortsEditorProps {
  model: FsmModel;
  onChange: (model: FsmModel) => void;
}

function editPort(ports: PortConfig[], index: number, patch: Partial<PortConfig>): PortConfig[] {
  return ports.map((port, itemIndex) => (itemIndex === index ? { ...port, ...patch } : port));
}

export function PortsEditor({ model, onChange }: PortsEditorProps) {
  return (
    <section className="panel">
      <h2>Ports</h2>
      <h3>Inputs</h3>
      {model.ports.inputs.map((port, index) => (
        <div className="row" key={`input-${index}`}>
          <input
            aria-label={`Input ${index + 1} name`}
            value={port.name}
            onChange={(event) =>
              onChange({ ...model, ports: { ...model.ports, inputs: editPort(model.ports.inputs, index, { name: event.target.value }) } })
            }
          />
          <input
            aria-label={`Input ${index + 1} width`}
            type="number"
            min={1}
            value={port.width}
            onChange={(event) =>
              onChange({ ...model, ports: { ...model.ports, inputs: editPort(model.ports.inputs, index, { width: Number(event.target.value) }) } })
            }
          />
        </div>
      ))}
      <button type="button" onClick={() => onChange({ ...model, ports: { ...model.ports, inputs: [...model.ports.inputs, { name: "input_sig", width: 1 }] } })}>
        Add input
      </button>
      <h3>Outputs</h3>
      {model.ports.outputs.map((port, index) => (
        <div className="row" key={`output-${index}`}>
          <input
            aria-label={`Output ${index + 1} name`}
            value={port.name}
            onChange={(event) =>
              onChange({ ...model, ports: { ...model.ports, outputs: editPort(model.ports.outputs, index, { name: event.target.value }) } })
            }
          />
          <input
            aria-label={`Output ${index + 1} width`}
            type="number"
            min={1}
            value={port.width}
            onChange={(event) =>
              onChange({ ...model, ports: { ...model.ports, outputs: editPort(model.ports.outputs, index, { width: Number(event.target.value) }) } })
            }
          />
        </div>
      ))}
      <button type="button" onClick={() => onChange({ ...model, ports: { ...model.ports, outputs: [...model.ports.outputs, { name: "output_sig", width: 1 }] } })}>
        Add output
      </button>
    </section>
  );
}
```

Create `src/ui/forms/StatesEditor.tsx`:

```tsx
import type { FsmModel, StateConfig } from "../../core/schema/types";

interface StatesEditorProps {
  model: FsmModel;
  onChange: (model: FsmModel) => void;
}

function editState(states: StateConfig[], index: number, patch: Partial<StateConfig>): StateConfig[] {
  return states.map((state, itemIndex) => (itemIndex === index ? { ...state, ...patch } : state));
}

export function StatesEditor({ model, onChange }: StatesEditorProps) {
  return (
    <section className="panel">
      <h2>States</h2>
      {model.states.map((state, index) => (
        <div className="state-editor" key={`state-${index}`}>
          <input
            aria-label={`State ${index + 1} name`}
            value={state.name}
            onChange={(event) => onChange({ ...model, states: editState(model.states, index, { name: event.target.value }) })}
          />
          <select
            aria-label={`State ${index + 1} initial selector`}
            value={model.initial === state.name ? state.name : ""}
            onChange={() => onChange({ ...model, initial: state.name })}
          >
            <option value="">Not initial</option>
            <option value={state.name}>Initial</option>
          </select>
          {model.ports.outputs.map((port) => (
            <input
              key={port.name}
              aria-label={`${state.name} ${port.name} Moore output`}
              value={String(state.outputs[port.name] ?? 0)}
              onChange={(event) =>
                onChange({
                  ...model,
                  states: editState(model.states, index, {
                    outputs: { ...state.outputs, [port.name]: event.target.value },
                  }),
                })
              }
            />
          ))}
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange({ ...model, states: [...model.states, { name: `S${model.states.length}`, outputs: {} }] })}
      >
        Add state
      </button>
    </section>
  );
}
```

Create `src/ui/forms/ConditionEditor.tsx`:

```tsx
import type { Condition, ConditionOperator } from "../../core/schema/types";

interface ConditionEditorProps {
  condition: Condition;
  onChange: (condition: Condition) => void;
}

export function ConditionEditor({ condition, onChange }: ConditionEditorProps) {
  if ("expr" in condition) {
    return (
      <input
        aria-label="Condition expression"
        value={condition.expr}
        onChange={(event) => onChange({ expr: event.target.value })}
      />
    );
  }

  if ("signal" in condition) {
    return (
      <div className="row">
        <input aria-label="Condition signal" value={condition.signal} onChange={(event) => onChange({ ...condition, signal: event.target.value })} />
        <select aria-label="Condition operator" value={condition.op} onChange={(event) => onChange({ ...condition, op: event.target.value as ConditionOperator })}>
          <option value="==">==</option>
          <option value="!=">!=</option>
          <option value="<">&lt;</option>
          <option value="<=">&lt;=</option>
          <option value=">">&gt;</option>
          <option value=">=">&gt;=</option>
        </select>
        <input aria-label="Condition value" value={String(condition.value)} onChange={(event) => onChange({ ...condition, value: event.target.value })} />
      </div>
    );
  }

  return (
    <button type="button" onClick={() => onChange({ expr: "start" })}>
      Convert condition to expression
    </button>
  );
}
```

Create `src/ui/forms/TransitionsEditor.tsx`:

```tsx
import type { FsmModel, TransitionConfig } from "../../core/schema/types";
import { ConditionEditor } from "./ConditionEditor";

interface TransitionsEditorProps {
  model: FsmModel;
  onChange: (model: FsmModel) => void;
}

function editTransition(
  transitions: TransitionConfig[],
  index: number,
  patch: Partial<TransitionConfig>,
): TransitionConfig[] {
  return transitions.map((transition, itemIndex) => (itemIndex === index ? { ...transition, ...patch } : transition));
}

export function TransitionsEditor({ model, onChange }: TransitionsEditorProps) {
  return (
    <section className="panel">
      <h2>Transitions</h2>
      {model.transitions.map((transition, index) => (
        <div className="transition-editor" key={`transition-${index}`}>
          <select
            aria-label={`Transition ${index + 1} from`}
            value={transition.from}
            onChange={(event) => onChange({ ...model, transitions: editTransition(model.transitions, index, { from: event.target.value }) })}
          >
            {model.states.map((state) => <option key={state.name} value={state.name}>{state.name}</option>)}
          </select>
          <select
            aria-label={`Transition ${index + 1} to`}
            value={transition.to}
            onChange={(event) => onChange({ ...model, transitions: editTransition(model.transitions, index, { to: event.target.value }) })}
          >
            {model.states.map((state) => <option key={state.name} value={state.name}>{state.name}</option>)}
          </select>
          <ConditionEditor
            condition={transition.when}
            onChange={(when) => onChange({ ...model, transitions: editTransition(model.transitions, index, { when }) })}
          />
          {model.mealy && model.ports.outputs.map((port) => (
            <input
              key={port.name}
              aria-label={`Transition ${index + 1} ${port.name} Mealy output`}
              value={String(transition.outputs[port.name] ?? "")}
              onChange={(event) =>
                onChange({
                  ...model,
                  transitions: editTransition(model.transitions, index, {
                    outputs: { ...transition.outputs, [port.name]: event.target.value },
                  }),
                })
              }
            />
          ))}
        </div>
      ))}
      <button
        type="button"
        onClick={() => {
          const first = model.states[0]?.name ?? "IDLE";
          onChange({ ...model, transitions: [...model.transitions, { from: first, to: first, when: { expr: "start" }, outputs: {} }] });
        }}
      >
        Add transition
      </button>
    </section>
  );
}
```

Create `src/ui/forms/FsmForm.tsx`:

```tsx
import type { FsmModel } from "../../core/schema/types";
import { ModuleSettings } from "./ModuleSettings";
import { PortsEditor } from "./PortsEditor";
import { StatesEditor } from "./StatesEditor";
import { TransitionsEditor } from "./TransitionsEditor";

interface FsmFormProps {
  model: FsmModel;
  onChange: (model: FsmModel) => void;
}

export function FsmForm({ model, onChange }: FsmFormProps) {
  return (
    <div className="form-stack">
      <ModuleSettings model={model} onChange={onChange} />
      <PortsEditor model={model} onChange={onChange} />
      <StatesEditor model={model} onChange={onChange} />
      <TransitionsEditor model={model} onChange={onChange} />
    </div>
  );
}
```

- [ ] **Step 5: Run form tests**

Run:

```bash
npm test -- src/ui/forms/FsmForm.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit form components**

Run:

```bash
git add src/ui/common src/ui/forms
git commit -m "feat: add fsm form editor"
```

Expected: commit records form builder components.

---

### Task 12: Build YAML, Diagnostics, Preview, Export Panels, And App Integration

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/styles.css`
- Create: `src/ui/yaml/YamlEditor.tsx`
- Create: `src/ui/preview/DiagnosticsPanel.tsx`
- Create: `src/ui/preview/PreviewTabs.tsx`
- Create: `src/ui/export/ExportPanel.tsx`
- Test: `src/App.test.tsx`

- [ ] **Step 1: Write failing app integration test**

Create `src/App.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("App integration", () => {
  it("updates YAML from form edits and keeps preview visible", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.clear(screen.getByLabelText("Module name"));
    await user.type(screen.getByLabelText("Module name"), "demo_fsm");

    expect(screen.getByText("demo_fsm.sv")).toBeInTheDocument();
    expect(screen.getByLabelText("YAML source")).toHaveValue(expect.stringContaining("module: demo_fsm"));
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run:

```bash
npm test -- src/App.test.tsx
```

Expected: FAIL because app integration components are missing.

- [ ] **Step 3: Implement YAML and diagnostics panels**

Create `src/ui/yaml/YamlEditor.tsx`:

```tsx
import CodeMirror from "@uiw/react-codemirror";
import { yaml } from "@codemirror/lang-yaml";

interface YamlEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export function YamlEditor({ value, onChange }: YamlEditorProps) {
  return (
    <section className="panel yaml-panel">
      <h2>YAML</h2>
      <textarea
        aria-label="YAML source"
        className="yaml-fallback"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <div className="codemirror-wrap" aria-hidden="true">
        <CodeMirror value={value} extensions={[yaml()]} onChange={onChange} basicSetup={{ lineNumbers: true }} />
      </div>
    </section>
  );
}
```

Create `src/ui/preview/DiagnosticsPanel.tsx`:

```tsx
import type { ParseDiagnostic } from "../../core/parser/yamlCodec";
import type { ValidationResult } from "../../core/validators/validateModel";

interface DiagnosticsPanelProps {
  parseDiagnostic: ParseDiagnostic | null;
  validation: ValidationResult;
}

export function DiagnosticsPanel({ parseDiagnostic, validation }: DiagnosticsPanelProps) {
  if (!parseDiagnostic && validation.errors.length === 0 && validation.warnings.length === 0) {
    return <section className="diagnostics ok">No diagnostics</section>;
  }

  return (
    <section className="diagnostics">
      {parseDiagnostic && (
        <p>
          YAML error{parseDiagnostic.line ? ` at ${parseDiagnostic.line}:${parseDiagnostic.column}` : ""}: {parseDiagnostic.message}
        </p>
      )}
      {validation.errors.map((error) => (
        <p key={`${error.path}-${error.message}`}>Error: {error.message}</p>
      ))}
      {validation.warnings.map((warning) => (
        <p key={`${warning.path}-${warning.message}`}>Warning: {warning.message}</p>
      ))}
    </section>
  );
}
```

- [ ] **Step 4: Implement preview and export panels**

Create `src/ui/preview/PreviewTabs.tsx`:

```tsx
import { useMemo, useState } from "react";
import type { GeneratedArtifacts } from "../../core/generators";

interface PreviewTabsProps {
  artifacts: GeneratedArtifacts;
}

const tabOrder: Array<keyof GeneratedArtifacts> = [
  "systemverilog",
  "verilog2001",
  "mermaid",
  "transitionTable",
  "testbench",
];

export function PreviewTabs({ artifacts }: PreviewTabsProps) {
  const [active, setActive] = useState<keyof GeneratedArtifacts>("systemverilog");
  const activeArtifact = artifacts[active];
  const buttons = useMemo(
    () =>
      tabOrder.map((key) => (
        <button className={active === key ? "active" : ""} key={key} type="button" onClick={() => setActive(key)}>
          {artifacts[key].filename}
        </button>
      )),
    [active, artifacts],
  );

  return (
    <section className="panel preview-panel">
      <h2>Preview</h2>
      <div className="tabs">{buttons}</div>
      <pre aria-label="Generated preview">{activeArtifact.content}</pre>
    </section>
  );
}
```

Create `src/ui/export/ExportPanel.tsx`:

```tsx
import type { GeneratedArtifacts } from "../../core/generators";
import { downloadArtifactsZip, downloadTextArtifact } from "../../core/export/exportZip";

interface ExportPanelProps {
  artifacts: GeneratedArtifacts;
}

export function ExportPanel({ artifacts }: ExportPanelProps) {
  const artifactList = Object.values(artifacts);

  return (
    <section className="panel export-panel">
      <h2>Export</h2>
      <button type="button" onClick={() => downloadArtifactsZip(artifactList, "fsmgen-artifacts.zip")}>
        Download zip
      </button>
      <div className="export-list">
        {artifactList.map((artifact) => (
          <button key={artifact.filename} type="button" onClick={() => downloadTextArtifact(artifact)}>
            {artifact.filename}
          </button>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 5: Integrate app state and panels**

Modify `src/App.tsx`:

```tsx
import { useMemo, useState } from "react";
import { generateAllArtifacts } from "./core/generators";
import { createInitialAppState, updateDraftModel, updateYamlText } from "./core/state/appState";
import { ExportPanel } from "./ui/export/ExportPanel";
import { FsmForm } from "./ui/forms/FsmForm";
import { DiagnosticsPanel } from "./ui/preview/DiagnosticsPanel";
import { PreviewTabs } from "./ui/preview/PreviewTabs";
import { YamlEditor } from "./ui/yaml/YamlEditor";

export function App() {
  const [state, setState] = useState(createInitialAppState);
  const artifacts = useMemo(() => generateAllArtifacts(state.lastValidModel), [state.lastValidModel]);

  return (
    <main className="app-shell">
      <section className="workspace">
        <header className="app-header">
          <h1>FSMGEN</h1>
          <p>Configure state machines and generate HDL artifacts.</p>
        </header>
        <DiagnosticsPanel parseDiagnostic={state.parseDiagnostic} validation={state.validation} />
        <div className="editor-grid">
          <FsmForm model={state.draftModel} onChange={(model) => setState((current) => updateDraftModel(current, model))} />
          <YamlEditor value={state.yamlText} onChange={(yamlText) => setState((current) => updateYamlText(current, yamlText))} />
        </div>
        <div className="output-grid">
          <PreviewTabs artifacts={artifacts} />
          <ExportPanel artifacts={artifacts} />
        </div>
      </section>
    </main>
  );
}
```

- [ ] **Step 6: Add layout styles**

Modify `src/styles.css` to include:

```css
.app-header {
  margin-bottom: 16px;
}

.app-header h1 {
  margin: 0;
  font-size: 28px;
  letter-spacing: 0;
}

.app-header p {
  margin: 4px 0 0;
  color: #59636e;
}

.editor-grid,
.output-grid {
  display: grid;
  grid-template-columns: minmax(320px, 0.95fr) minmax(360px, 1.05fr);
  gap: 16px;
  align-items: start;
}

.output-grid {
  grid-template-columns: minmax(420px, 1fr) 280px;
  margin-top: 16px;
}

.form-stack {
  display: grid;
  gap: 12px;
}

.panel {
  border: 1px solid #d8dee8;
  border-radius: 8px;
  background: #ffffff;
  padding: 14px;
}

.panel h2 {
  margin: 0 0 10px;
  font-size: 16px;
}

.panel h3 {
  margin: 12px 0 8px;
  font-size: 14px;
}

.field {
  display: grid;
  gap: 5px;
  margin-bottom: 10px;
}

.field span,
.checkbox-row span {
  color: #37414c;
  font-size: 13px;
}

.checkbox-row {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 10px;
}

.row,
.state-editor,
.transition-editor,
.tabs,
.export-list {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
  margin-bottom: 8px;
}

input,
select,
textarea {
  border: 1px solid #c7d0dd;
  border-radius: 6px;
  padding: 8px 9px;
  background: #ffffff;
  color: #172026;
}

button {
  border: 1px solid #b7c2d0;
  border-radius: 6px;
  padding: 8px 10px;
  background: #eef3f8;
  color: #172026;
  cursor: pointer;
}

button.active {
  background: #234c75;
  color: #ffffff;
  border-color: #234c75;
}

.yaml-panel {
  min-height: 560px;
}

.yaml-fallback {
  width: 100%;
  min-height: 420px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}

.codemirror-wrap {
  display: none;
}

.preview-panel pre {
  min-height: 320px;
  overflow: auto;
  margin: 0;
  padding: 12px;
  border-radius: 6px;
  background: #111827;
  color: #e5edf5;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 13px;
}

.diagnostics {
  margin-bottom: 16px;
  border: 1px solid #d8dee8;
  border-radius: 8px;
  background: #fff8e6;
  padding: 10px 12px;
}

.diagnostics.ok {
  background: #ecf8f0;
}

@media (max-width: 920px) {
  .editor-grid,
  .output-grid {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 7: Run app integration test**

Run:

```bash
npm test -- src/App.test.tsx
```

Expected: PASS.

- [ ] **Step 8: Commit app integration**

Run:

```bash
git add src/App.tsx src/App.test.tsx src/styles.css src/ui/yaml src/ui/preview src/ui/export
git commit -m "feat: integrate fsmgen gui"
```

Expected: commit records integrated UI.

---

### Task 13: Final Verification And Static App Run

**Files:**
- Modify only if verification exposes defects in files created by earlier tasks.

- [ ] **Step 1: Run full test suite**

Run:

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 2: Run TypeScript and production build**

Run:

```bash
npm run build
```

Expected: TypeScript compilation and Vite production build pass.

- [ ] **Step 3: Start local dev server**

Run:

```bash
npm run dev -- --port 5173
```

Expected: Vite serves the app at `http://127.0.0.1:5173/`.

- [ ] **Step 4: Browser smoke test**

Open `http://127.0.0.1:5173/` and verify:

- Form edits change the YAML text.
- Valid YAML edits change the form.
- Invalid YAML shows a diagnostic and preserves generated previews from the last valid model.
- SystemVerilog, Verilog-2001, Mermaid, transition table, and testbench previews are visible.
- Export buttons trigger file downloads.

- [ ] **Step 5: Commit verification fixes**

If Step 1 through Step 4 required code changes, run:

```bash
git add .
git commit -m "fix: polish fsmgen verification"
```

Expected: any verification fixes are committed. If no changes were required, no commit is created.

---

## Self-Review Notes

- Spec coverage: the plan covers static frontend delivery, form-first GUI, YAML synchronization, dual condition model, Moore default with Mealy toggle, SystemVerilog and Verilog-2001 generation, Mermaid, transition table, testbench skeleton, browser export, and tests.
- Marker scan: this plan avoids unresolved markers and gives concrete file paths, commands, and expected outcomes.
- Type consistency: model property names match across schema, parser, validators, generators, state synchronization, and UI components.
