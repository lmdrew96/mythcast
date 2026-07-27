import { describe, expect, it } from "vitest";
import { runStubPipeline } from "@/lib/pipeline";
import type { CultureSeedParams } from "@/lib/types";

const seed: CultureSeedParams = {
  climate: "temperate",
  resourceScarcity: "moderate",
  threatModel: "rival-clans",
  kinshipStructure: "patrilineal",
  settlementPattern: "fixed-agrarian",
  cosmologyStance: "polytheist-ancestral",
  technologyLevel: "iron",
  governmentType: "hereditary-monarchy",
};

describe("stub pipeline", () => {
  it("runs seed -> culture -> pantheon -> myth end to end", () => {
    const { culture, pantheon, myth } = runStubPipeline(seed);

    expect(culture.seed).toEqual(seed);
    expect(pantheon.length).toBeGreaterThan(0);
    expect(pantheon[0].cultureId).toBe(culture.id);
    expect(myth.cultureId).toBe(culture.id);
    expect(myth.events.length).toBeGreaterThan(0);
  });
});
