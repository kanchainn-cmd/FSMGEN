import { generateSystemVerilog } from "./systemverilog";
import { generateVerilog2001 } from "./verilog2001";
import type { FsmModel } from "../schema/types";
import { generateMermaid } from "./mermaid";
import { generateTransitionTableMarkdown } from "./transitionTable";
import { generateTestbench } from "./testbench";

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
      filename: `tb_${model.module}.sv`,
      content: generateTestbench(model),
      language: "systemverilog",
    },
  };
}

export { generateMermaid } from "./mermaid";
export {
  generateTransitionTableHtml,
  generateTransitionTableMarkdown,
} from "./transitionTable";
export { generateTestbench } from "./testbench";
export { generateSystemVerilog } from "./systemverilog";
export { generateVerilog2001 } from "./verilog2001";
