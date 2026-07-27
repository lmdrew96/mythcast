// Pure layout math for the relationship graph view (spec Section 8: gods as
// nodes, relationships as edges). A simple circular layout is proportional
// to typical pantheon sizes (spec Section 4: scales with culture richness,
// but stays a handful to a dozen gods, not hundreds) — no force-directed
// simulation library needed.

export type GraphNode = { id: string; name: string };
export type GraphEdge = { fromId: string; toId: string; relType: string };
export type PositionedNode = GraphNode & { x: number; y: number };

export function circularLayout(nodes: GraphNode[], center = { x: 200, y: 200 }, radius = 160): PositionedNode[] {
  const count = nodes.length;
  if (count === 0) return [];
  if (count === 1) return [{ ...nodes[0], x: center.x, y: center.y }];

  return nodes.map((node, index) => {
    const angle = (2 * Math.PI * index) / count - Math.PI / 2; // first node at the top, clockwise from there
    return { ...node, x: center.x + radius * Math.cos(angle), y: center.y + radius * Math.sin(angle) };
  });
}
