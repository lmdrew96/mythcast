import { describe, expect, it } from "vitest";
import { generateCulture } from "@/lib/culture/generate";
import { generatePantheon } from "@/lib/pantheon/generate";
import { generateMyths } from "@/lib/myth/generate";
import type { CultureSeedParams } from "@/lib/types";

const seed: CultureSeedParams = {
  climate: "volcanic",
  resourceScarcity: "scarce",
  threatModel: "rival-clans",
  kinshipStructure: "patrilineal",
  settlementPattern: "fixed-agrarian",
  cosmologyStance: "polytheist-ancestral",
  technologyLevel: "iron",
  governmentType: "hereditary-monarchy",
};

describe("generateMyths", () => {
  it("always includes at least an origin myth and a cautionary tale", () => {
    const culture = generateCulture(seed, 1);
    const pantheon = generatePantheon(culture, 1);
    const myths = generateMyths(culture, pantheon, 1);
    expect(myths.length).toBeGreaterThanOrEqual(2);
  });

  it("gives every myth exactly the four typed events in order", () => {
    const culture = generateCulture(seed, 1);
    const pantheon = generatePantheon(culture, 1);
    const myths = generateMyths(culture, pantheon, 1);
    for (const myth of myths) {
      expect(myth.events.map((e) => e.type)).toEqual(["god-acts", "consequence", "human-response", "moral-outcome"]);
    }
  });

  it("is generation 0 (no drift yet) and traces every event to a culture/god/seed field", () => {
    const culture = generateCulture(seed, 1);
    const pantheon = generatePantheon(culture, 1);
    const myths = generateMyths(culture, pantheon, 1);
    for (const myth of myths) {
      expect(myth.generation).toBe(0);
      expect(myth.cultureId).toBe(culture.id);
      for (const e of myth.events) {
        expect(e.derivedFrom.length).toBeGreaterThan(0);
        expect(e.involvedGodIds.length).toBeGreaterThan(0);
        for (const godId of e.involvedGodIds) {
          expect(pantheon.some((g) => g.id === godId)).toBe(true);
        }
      }
    }
  });

  it("is deterministic for the same culture, pantheon, and rng seed", () => {
    const culture = generateCulture(seed, 1);
    const pantheon = generatePantheon(culture, 1);
    const a = generateMyths(culture, pantheon, 7);
    const b = generateMyths(culture, pantheon, 7);
    expect(a).toEqual(b);
  });

  it("generates exactly one mismatch myth per flagged god, and none for clean gods", () => {
    const culture = generateCulture(seed, 1);
    // Sample rng seeds until we get a pantheon with at least one flagged mismatch.
    let pantheon = generatePantheon(culture, 0);
    let pSeed = 0;
    while (!pantheon.some((g) => g.personalityMismatch.isMismatch) && pSeed < 50) {
      pSeed++;
      pantheon = generatePantheon(culture, pSeed);
    }
    const mismatched = pantheon.filter((g) => g.personalityMismatch.isMismatch);
    expect(mismatched.length).toBeGreaterThan(0);

    const myths = generateMyths(culture, pantheon, 1);
    const mismatchMyths = myths.filter((m) => m.title.includes("Unexplained Turn"));
    expect(mismatchMyths.length).toBe(mismatched.length);
    for (const god of mismatched) {
      expect(mismatchMyths.some((m) => m.title.startsWith(god.name))).toBe(true);
    }
  });

  it("does not generate a mismatch myth when no god is flagged", () => {
    const culture = generateCulture(seed, 1);
    let pantheon = generatePantheon(culture, 0);
    let pSeed = 0;
    while (pantheon.some((g) => g.personalityMismatch.isMismatch) && pSeed < 50) {
      pSeed++;
      pantheon = generatePantheon(culture, pSeed);
    }
    expect(pantheon.some((g) => g.personalityMismatch.isMismatch)).toBe(false);

    const myths = generateMyths(culture, pantheon, 1);
    expect(myths.some((m) => m.title.includes("Unexplained Turn"))).toBe(false);
  });
});
