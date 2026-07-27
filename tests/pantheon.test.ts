import { describe, expect, it } from "vitest";
import { generateCulture } from "@/lib/culture/generate";
import { generatePantheon, pantheonSize } from "@/lib/pantheon/generate";
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

describe("generatePantheon", () => {
  it("scales pantheon size to culture richness, within bounds", () => {
    const culture = generateCulture(seed, 1);
    const size = pantheonSize(culture);
    expect(size).toBeGreaterThanOrEqual(3);
    expect(size).toBeLessThanOrEqual(8);

    const pantheon = generatePantheon(culture, 1);
    expect(pantheon.length).toBe(size);
  });

  it("is deterministic for the same culture and rng seed", () => {
    const culture = generateCulture(seed, 1);
    const a = generatePantheon(culture, 5);
    const b = generatePantheon(culture, 5);
    expect(a).toEqual(b);
  });

  it("never assigns the same domain to two different gods", () => {
    const culture = generateCulture(seed, 1);
    const pantheon = generatePantheon(culture, 3);
    const allDomains = pantheon.flatMap((g) => g.domains.value);
    expect(new Set(allDomains).size).toBe(allDomains.length);
  });

  it("gives every god a unique name within the pantheon", () => {
    const culture = generateCulture(seed, 1);
    const pantheon = generatePantheon(culture, 9);
    const names = pantheon.map((g) => g.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("traces every god's domains and personality back to culture/seed fields", () => {
    const culture = generateCulture(seed, 1);
    const pantheon = generatePantheon(culture, 4);
    for (const god of pantheon) {
      expect(god.domains.derivedFrom.length).toBeGreaterThan(0);
      expect(god.personality.derivedFrom.length).toBeGreaterThan(0);
      for (const cause of god.domains.derivedFrom) {
        expect(cause).toMatch(/^(seed|culture)\./);
      }
    }
  });

  it("flags mismatches with an expected personality and explanation hook, and leaves non-mismatches unflagged", () => {
    const culture = generateCulture(seed, 1);
    // Sample many rng seeds so both mismatch and non-mismatch cases show up.
    const pantheons = Array.from({ length: 30 }, (_, i) => generatePantheon(culture, i)).flat();
    const mismatched = pantheons.filter((g) => g.personalityMismatch.isMismatch);
    const clean = pantheons.filter((g) => !g.personalityMismatch.isMismatch);

    expect(mismatched.length).toBeGreaterThan(0);
    expect(clean.length).toBeGreaterThan(0);
    for (const god of mismatched) {
      expect(god.personalityMismatch.expectedPersonality).toBeTruthy();
      expect(god.personalityMismatch.explanationHook).toBeTruthy();
      // The flagged personality actually differs from what was expected —
      // otherwise "mismatch" would be a meaningless label.
      expect(god.personality.value.join(",")).not.toBe(god.personalityMismatch.expectedPersonality!.split(", ").join(","));
    }
    for (const god of clean) {
      expect(god.personalityMismatch.expectedPersonality).toBeUndefined();
      expect(god.personalityMismatch.explanationHook).toBeUndefined();
    }
  });

  it("consolidates at least one god onto multiple domains across enough samples", () => {
    const culture = generateCulture(seed, 1);
    const anyConsolidated = Array.from({ length: 20 }, (_, i) => generatePantheon(culture, i))
      .flat()
      .some((g) => g.domains.value.length > 1);
    expect(anyConsolidated).toBe(true);
  });
});
