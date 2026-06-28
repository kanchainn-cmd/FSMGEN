import { useEffect, useState } from "react";
import type { GeneratedArtifact } from "../../core/generators";

type PreviewMode = "code" | "render";

interface MermaidEdge {
  from: string;
  to: string;
  label: string;
}

interface RenderedMarkdownTable {
  headers: string[];
  rows: string[][];
}

export function PreviewTabs({ artifacts }: { artifacts: GeneratedArtifact[] }) {
  const [activeFilename, setActiveFilename] = useState(artifacts[0]?.filename ?? "");
  const [previewMode, setPreviewMode] = useState<PreviewMode>("code");
  const activeArtifact =
    artifacts.find((artifact) => artifact.filename === activeFilename) ?? artifacts[0];
  const canRender = activeArtifact
    ? activeArtifact.language === "mermaid" || activeArtifact.language === "markdown"
    : false;

  useEffect(() => {
    if (!artifacts.some((artifact) => artifact.filename === activeFilename)) {
      setActiveFilename(artifacts[0]?.filename ?? "");
    }
  }, [activeFilename, artifacts]);

  useEffect(() => {
    if (!canRender) {
      setPreviewMode("code");
    }
  }, [canRender]);

  return (
    <section className="panel preview-panel" aria-labelledby="preview-heading">
      <div className="panel-heading">
        <h2 id="preview-heading">Preview</h2>
        {canRender ? (
          <div className="preview-mode-toggle" aria-label="Preview mode">
            <button
              aria-pressed={previewMode === "code"}
              onClick={() => setPreviewMode("code")}
              type="button"
            >
              Code
            </button>
            <button
              aria-pressed={previewMode === "render"}
              onClick={() => setPreviewMode("render")}
              type="button"
            >
              Render
            </button>
          </div>
        ) : null}
      </div>

      <div className="tabs" role="tablist" aria-label="Generated artifacts">
        {artifacts.map((artifact) => (
          <button
            aria-controls={`artifact-panel-${artifact.filename}`}
            aria-selected={artifact.filename === activeArtifact?.filename}
            className="tab-button"
            id={`artifact-tab-${artifact.filename}`}
            key={artifact.filename}
            onClick={() => setActiveFilename(artifact.filename)}
            role="tab"
            type="button"
          >
            {artifact.filename}
          </button>
        ))}
      </div>

      {activeArtifact ? (
        <div
          aria-labelledby={`artifact-tab-${activeArtifact.filename}`}
          id={`artifact-panel-${activeArtifact.filename}`}
          role="tabpanel"
        >
          {previewMode === "render" && canRender ? (
            <RenderedArtifact artifact={activeArtifact} />
          ) : (
            <pre
              aria-label="Artifact content"
              className={`artifact-preview language-${activeArtifact.language}`}
            >
              <code>{activeArtifact.content}</code>
            </pre>
          )}
        </div>
      ) : (
        <p className="empty-state">No artifacts generated</p>
      )}
    </section>
  );
}

function RenderedArtifact({ artifact }: { artifact: GeneratedArtifact }) {
  if (artifact.language === "mermaid") {
    return <MermaidStateDiagram content={artifact.content} />;
  }

  const table = parseMarkdownTable(artifact.content);

  if (!table) {
    return (
      <div className="render-empty" role="status">
        This Markdown preview supports table artifacts.
      </div>
    );
  }

  return (
    <div className="rendered-artifact">
      <table className="rendered-markdown-table">
        <thead>
          <tr>
            {table.headers.map((header) => (
              <th key={header}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, rowIndex) => (
            <tr key={`${row.join("|")}-${rowIndex}`}>
              {table.headers.map((_, cellIndex) => (
                <td key={cellIndex}>{row[cellIndex] ?? ""}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MermaidStateDiagram({ content }: { content: string }) {
  const edges = parseMermaidEdges(content);

  if (edges.length === 0) {
    return (
      <div className="render-empty" role="status">
        No state transitions found in this Mermaid artifact.
      </div>
    );
  }

  const stateNames = Array.from(
    new Set(edges.flatMap((edge) => [edge.from, edge.to]).filter((state) => state !== "[*]")),
  );
  const width = 760;
  const stateGap = stateNames.length > 1 ? 620 / (stateNames.length - 1) : 0;
  const positions = new Map(
    stateNames.map((state, index) => [
      state,
      {
        x: stateNames.length === 1 ? width / 2 : 70 + index * stateGap,
        y: 118 + (index % 2) * 88,
      },
    ]),
  );
  const height = stateNames.length > 1 ? 310 : 230;

  return (
    <div className="rendered-artifact rendered-diagram" aria-label="Rendered state diagram">
      <svg
        className="state-diagram"
        role="img"
        viewBox={`0 0 ${width} ${height}`}
        xmlns="http://www.w3.org/2000/svg"
      >
        <title>Rendered Mermaid state transition diagram</title>
        <defs>
          <marker
            id="state-arrow"
            markerHeight="8"
            markerWidth="8"
            orient="auto"
            refX="7"
            refY="4"
          >
            <path d="M0,0 L8,4 L0,8 Z" />
          </marker>
        </defs>

        {edges.map((edge, index) => (
          <StateEdge
            edge={edge}
            index={index}
            key={`${edge.from}-${edge.to}-${edge.label}-${index}`}
            positions={positions}
          />
        ))}

        {stateNames.map((state) => {
          const position = positions.get(state);

          if (!position) {
            return null;
          }

          return (
            <g
              className="state-node"
              key={state}
              transform={`translate(${position.x} ${position.y})`}
            >
              <rect height="44" rx="7" width="116" x="-58" y="-22" />
              <text dominantBaseline="middle" textAnchor="middle">
                {state}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function StateEdge({
  edge,
  index,
  positions,
}: {
  edge: MermaidEdge;
  index: number;
  positions: Map<string, { x: number; y: number }>;
}) {
  const to = positions.get(edge.to);

  if (!to) {
    return null;
  }

  if (edge.from === "[*]") {
    const start = { x: Math.max(28, to.x - 110), y: to.y };

    return (
      <g className="state-edge">
        <circle cx={start.x} cy={start.y} r="8" />
        <path
          d={`M ${start.x + 10} ${start.y} L ${to.x - 62} ${to.y}`}
          markerEnd="url(#state-arrow)"
        />
      </g>
    );
  }

  const from = positions.get(edge.from);

  if (!from) {
    return null;
  }

  const isSelfLoop = edge.from === edge.to;
  const labelOffset = index % 2 === 0 ? -12 : 16;

  if (isSelfLoop) {
    return (
      <g className="state-edge">
        <path
          d={`M ${from.x + 40} ${from.y - 24} C ${from.x + 88} ${from.y - 76}, ${from.x + 88} ${from.y + 30}, ${from.x + 52} ${from.y + 22}`}
          markerEnd="url(#state-arrow)"
        />
        <text x={from.x + 92} y={from.y - 34}>
          {edge.label}
        </text>
      </g>
    );
  }

  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.max(Math.hypot(dx, dy), 1);
  const offsetX = (dx / distance) * 64;
  const offsetY = (dy / distance) * 30;
  const startX = from.x + offsetX;
  const startY = from.y + offsetY;
  const endX = to.x - offsetX;
  const endY = to.y - offsetY;
  const midX = (startX + endX) / 2;
  const midY = (startY + endY) / 2 + labelOffset;

  return (
    <g className="state-edge">
      <path d={`M ${startX} ${startY} L ${endX} ${endY}`} markerEnd="url(#state-arrow)" />
      <text x={midX} y={midY}>
        {edge.label}
      </text>
    </g>
  );
}

function parseMermaidEdges(content: string): MermaidEdge[] {
  return content
    .split("\n")
    .map((line) => line.trim())
    .map((line) => line.match(/^(.+?)\s*-->\s*(.+?)(?:\s*:\s*(.*))?$/))
    .filter((match): match is RegExpMatchArray => Boolean(match))
    .map((match) => ({
      from: match[1].trim(),
      to: match[2].trim(),
      label: match[3]?.trim() ?? "",
    }));
}

function parseMarkdownTable(content: string): RenderedMarkdownTable | null {
  const tableLines = content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("|") && line.endsWith("|"));

  if (tableLines.length < 2 || !isMarkdownSeparator(splitMarkdownRow(tableLines[1]))) {
    return null;
  }

  return {
    headers: splitMarkdownRow(tableLines[0]),
    rows: tableLines.slice(2).map(splitMarkdownRow),
  };
}

function splitMarkdownRow(row: string): string[] {
  const trimmed = row.replace(/^\|/, "").replace(/\|$/, "");
  const cells: string[] = [];
  let current = "";
  let escaped = false;

  for (const character of trimmed) {
    if (escaped) {
      current += character;
      escaped = false;
      continue;
    }

    if (character === "\\") {
      escaped = true;
      continue;
    }

    if (character === "|") {
      cells.push(current.trim());
      current = "";
      continue;
    }

    current += character;
  }

  cells.push(current.trim());
  return cells;
}

function isMarkdownSeparator(cells: string[]): boolean {
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}
