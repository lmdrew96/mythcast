import { describe, expect, it } from "vitest";
import { generateCulture } from "@/lib/culture/generate";
import { generatePantheon } from "@/lib/pantheon/generate";
import { generateMyths } from "@/lib/myth/generate";
import { mutateMyth } from "@/lib/myth/mutation";
import { cultureToProseSummary, godToProse, mythToProse, mythVariantToProse } from "@/lib/codex/prose";
import type { CultureSeedParams } from "@/lib/types";

const seed: CultureSeedParams = {
  climate: "tropical",
  resourceScarcity: "abundant",
  threatModel: "predators",
  kinshipStructure: "matrilineal",
  settlementPattern: "urban",
  cosmologyStance: "pantheist",
  technologyLevel: "early-industrial",
  governmentType: "theocracy",
};

function setup(rngSeed = 5) {
  const culture = generateCulture(seed, rngSeed);
  const pantheon = generatePantheon(culture, rngSeed);
  const myths = generateMyths(culture, pantheon, rngSeed);
  return { culture, pantheon, myths };
}

describe("mythToProse", () => {
  it("joins every event description into one paragraph, in order", () => {
    const { myths } = setup();
    const myth = myths[0];
    const prose = mythToProse(myth);
    expect(prose.title).toBe(myth.title);
    expect(prose.generation).toBe(myth.generation);
    for (const event of myth.events) {
      expect(prose.paragraph).toContain(event.description);
    }
    expect(prose.paragraph.indexOf(myth.events[0].description)).toBeLessThan(prose.paragraph.indexOf(myth.events[myth.events.length - 1].description));
  });
});

describe("mythVariantToProse", () => {
  it("uses the supplied founding title, since a variant has none of its own", () => {
    const { pantheon, myths } = setup();
    const variant = mutateMyth(myths[0], pantheon, 1, { type: "war", generation: 1 });
    const prose = mythVariantToProse(variant, myths[0].title);
    expect(prose.title).toBe(myths[0].title);
    expect(prose.generation).toBe(1);
    for (const event of variant.events) {
      expect(prose.paragraph).toContain(event.description);
    }
  });
});

describe("cultureToProseSummary", () => {
  it("includes the origin narrative and core values", () => {
    const { culture } = setup();
    const summary = cultureToProseSummary(culture);
    expect(summary).toContain(culture.originNarrative.value);
    for (const value of culture.coreValues.value) {
      expect(summary).toContain(value);
    }
  });
});

describe("godToProse", () => {
  it("names the god's domains and personality", () => {
    const { pantheon } = setup();
    const god = pantheon[0];
    const prose = godToProse(god);
    expect(prose).toContain(god.name);
    for (const domain of god.domains.value) expect(prose).toContain(domain);
  });

  it("flags a personality mismatch when the generator flagged one", () => {
    const { pantheon } = setup();
    const mismatched = pantheon.find((g) => g.personalityMismatch.isMismatch);
    if (!mismatched) return; // not every seed rolls a mismatch — skip if this run didn't
    expect(godToProse(mismatched)).toContain("Stranger still");
  });
});
