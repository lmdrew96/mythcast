"use client";

import { circularLayout, type GraphEdge, type GraphNode } from "@/lib/graph/layout";

const REL_TYPE_LABEL: Record<string, string> = {
  PARENT_OF: "parent of",
  RIVAL_OF: "rival of",
  CONSORT_OF: "consort of",
  USURPED_BY: "usurped by",
};

export function RelationshipGraph({ nodes, edges }: { nodes: GraphNode[]; edges: GraphEdge[] }) {
  if (nodes.length === 0) {
    return <p className="text-sm italic opacity-70">No gods to graph yet.</p>;
  }

  const size = 400;
  const positioned = circularLayout(nodes, { x: size / 2, y: size / 2 }, size / 2 - 60);
  const byId = new Map(positioned.map((n) => [n.id, n]));

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="h-auto w-full max-w-xl">
      <defs>
        <marker id="arrowhead" markerWidth="8" markerHeight="8" refX="8" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 Z" fill="var(--mc-secondary, currentColor)" />
        </marker>
      </defs>
      {edges.map((edge, i) => {
        const from = byId.get(edge.fromId);
        const to = byId.get(edge.toId);
        if (!from || !to) return null;
        const midX = (from.x + to.x) / 2;
        const midY = (from.y + to.y) / 2;
        return (
          <g key={i}>
            <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="var(--mc-secondary, currentColor)" strokeWidth={1.5} markerEnd="url(#arrowhead)" />
            <text
              x={midX}
              y={midY}
              fontSize={9}
              fontFamily="var(--font-mono)"
              letterSpacing="0.02em"
              textAnchor="middle"
              fill="var(--mc-text, currentColor)"
              className="opacity-70 uppercase"
            >
              {REL_TYPE_LABEL[edge.relType] ?? edge.relType}
            </text>
          </g>
        );
      })}
      {positioned.map((node) => (
        <g key={node.id} className="transition-transform duration-150 hover:-translate-y-0.5">
          <circle cx={node.x} cy={node.y} r={28} fill="var(--mc-primary, currentColor)" />
          <text x={node.x} y={node.y + 42} fontSize={13} fontFamily="var(--font-display)" textAnchor="middle" fill="var(--mc-text, currentColor)">
            {node.name}
          </text>
        </g>
      ))}
    </svg>
  );
}
