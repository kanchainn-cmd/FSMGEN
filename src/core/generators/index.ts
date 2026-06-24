import { generateSystemVerilog } from "./systemverilog";
import { generateVerilog2001 } from "./verilog2001";
import type { FsmModel } from "../schema/types";
import { generateMermaid } from "./mermaid";
import { generateTransitionTableMarkdown } from "./transitionTable";
import { generateTestbench } from "./testbench";

export interface GeneratedArtifact {
  filename: string;
  content: string;
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
    },
    verilog2001: {
      filename: `${model.module}.v`,
      content: generateVerilog2001(model),
    },
    mermaid: {
      filename: `${model.module}.mmd`,
      content: generateMermaid(model),
    },
    transitionTable: {
      filename: `${model.module}_transitions.md`,
      content: generateTransitionTableMarkdown(model),
    },
    testbench: {
      filename: `tb_${model.module}.sv`,
      content: generateTestbench(model),
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
