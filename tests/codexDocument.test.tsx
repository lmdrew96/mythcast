import { describe, expect, it } from "vitest";
import { renderToBuffer } from "@react-pdf/renderer";
import { CodexDocument } from "@/lib/codex/CodexDocument";
import { THEMES } from "@/lib/theming/palettes";

const sampleData = {
  cultureName: "Test Culture",
  summary: "A summary of the culture's origin.",
  gods: [{ name: "Test God", prose: "Test God, keeper of the sky, is known as stern.", domains: ["sky", "storm"], personality: ["stern"] }],
  myths: [{ title: "The First Days", generation: 0, paragraph: "Once, before there were people, the god shaped the world." }],
  factions: [{ name: "The Priesthood of Test God", goal: "Preserve the origin narrative.", allegiance: "Test God" }],
  tensions: ["Isolationist by threat model, but scarce enough in resources to need outside trade."],
};

describe("CodexDocument", () => {
  it("renders a valid PDF in styled mode", async () => {
    const buffer = await renderToBuffer(<CodexDocument mode="styled" colors={THEMES["nightfall-indigo"].light} data={sampleData} />);
    expect(buffer.subarray(0, 4).toString("latin1")).toBe("%PDF");
    expect(buffer.length).toBeGreaterThan(0);
  });

  it("renders a valid PDF in printer-friendly mode", async () => {
    const buffer = await renderToBuffer(<CodexDocument mode="printer-friendly" colors={THEMES["autumn-hearth"].dark} data={sampleData} />);
    expect(buffer.subarray(0, 4).toString("latin1")).toBe("%PDF");
  });

  it("renders with no gods or myths without throwing", async () => {
    const buffer = await renderToBuffer(<CodexDocument mode="styled" colors={THEMES["moonlit-thicket"].light} data={{ ...sampleData, gods: [], myths: [] }} />);
    expect(buffer.subarray(0, 4).toString("latin1")).toBe("%PDF");
  });

  it("renders a valid PDF in reference mode", async () => {
    const buffer = await renderToBuffer(<CodexDocument mode="reference" colors={THEMES["nightfall-indigo"].light} data={sampleData} />);
    expect(buffer.subarray(0, 4).toString("latin1")).toBe("%PDF");
  });

  it("renders reference mode with no factions or tensions without throwing", async () => {
    const buffer = await renderToBuffer(
      <CodexDocument mode="reference" colors={THEMES["nightfall-indigo"].light} data={{ ...sampleData, factions: [], tensions: [] }} />,
    );
    expect(buffer.subarray(0, 4).toString("latin1")).toBe("%PDF");
  });
});
