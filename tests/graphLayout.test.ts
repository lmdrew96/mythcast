import { describe, expect, it } from "vitest";
import { circularLayout } from "@/lib/graph/layout";

describe("circularLayout", () => {
  it("returns an empty array for no nodes", () => {
    expect(circularLayout([])).toEqual([]);
  });

  it("places a single node at the center", () => {
    const [node] = circularLayout([{ id: "a", name: "A" }], { x: 100, y: 100 }, 50);
    expect(node.x).toBeCloseTo(100);
    expect(node.y).toBeCloseTo(100);
  });

  it("places the first node at the top of the circle", () => {
    const [first] = circularLayout(
      [
        { id: "a", name: "A" },
        { id: "b", name: "B" },
        { id: "c", name: "C" },
      ],
      { x: 0, y: 0 },
      100,
    );
    expect(first.x).toBeCloseTo(0);
    expect(first.y).toBeCloseTo(-100);
  });

  it("distributes nodes evenly around the circle (all equidistant from center)", () => {
    const center = { x: 50, y: 50 };
    const radius = 80;
    const nodes = circularLayout(
      Array.from({ length: 6 }, (_, i) => ({ id: `n${i}`, name: `N${i}` })),
      center,
      radius,
    );
    for (const node of nodes) {
      const dist = Math.hypot(node.x - center.x, node.y - center.y);
      expect(dist).toBeCloseTo(radius, 5);
    }
  });

  it("preserves node id and name", () => {
    const [node] = circularLayout([{ id: "god-1", name: "Test God" }]);
    expect(node.id).toBe("god-1");
    expect(node.name).toBe("Test God");
  });
});
