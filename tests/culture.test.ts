import { describe, expect, it } from "vitest";
import { cultureRngSeed, generateCulture } from "@/lib/culture/generate";
import type { CultureSeedParams } from "@/lib/types";

const baseSeed: CultureSeedParams = {
  climate: "arid",
  resourceScarcity: "famine-prone",
  threatModel: "isolated",
  kinshipStructure: "clan-based",
  settlementPattern: "semi-nomadic",
  cosmologyStance: "animist",
  technologyLevel: "bronze",
  governmentType: "stateless-egalitarian",
};

function tracedFields(culture: ReturnType<typeof generateCulture>) {
  return [
    culture.coreValues,
    culture.taboos,
    culture.conflictResolutionNorms,
    culture.socialStructure,
    culture.ritualPractices,
    culture.artSensibility,
    culture.economicStructure,
    culture.genderRoleNorms,
    culture.originNarrative,
    culture.namingConvention,
  ];
}

describe("generateCulture", () => {
  it("traces every field back to at least one seed parameter", () => {
    const culture = generateCulture(baseSeed, 1);
    for (const field of tracedFields(culture)) {
      expect(field.derivedFrom.length).toBeGreaterThan(0);
      for (const cause of field.derivedFrom) {
        expect(cause).toMatch(/^seed\./);
      }
    }
  });

  it("is deterministic for the same seed params and rng seed", () => {
    const a = generateCulture(baseSeed, 42);
    const b = generateCulture(baseSeed, 42);
    expect(a).toEqual(b);
  });

  it("derives a stable rng seed from seed params alone when none is passed explicitly", () => {
    const a = generateCulture(baseSeed);
    const b = generateCulture(baseSeed);
    expect(a).toEqual(b);
    expect(cultureRngSeed(baseSeed)).toBe(cultureRngSeed(baseSeed));
  });

  it("produces varied output across different rng seeds (not a lookup table)", () => {
    const outputs = new Set(
      Array.from({ length: 8 }, (_, i) => JSON.stringify(generateCulture(baseSeed, i).coreValues.value)),
    );
    expect(outputs.size).toBeGreaterThan(1);
  });

  it("ranks the requested count of distinct core values and taboos", () => {
    const culture = generateCulture(baseSeed, 7);
    expect(culture.coreValues.value.length).toBe(5);
    expect(new Set(culture.coreValues.value).size).toBe(5);
    expect(culture.taboos.value.length).toBe(4);
    expect(new Set(culture.taboos.value).size).toBe(4);
  });

  it("picks a valid economic structure enum value", () => {
    const culture = generateCulture(baseSeed, 3);
    expect(["gift-economy", "barter", "tribute", "trade-based"]).toContain(culture.economicStructure.value);
  });

  it("flags emergent tension without eliminating it (isolated + famine-prone -> trade-dependency tension)", () => {
    const culture = generateCulture(baseSeed, 1);
    expect(culture.flaggedTensions.length).toBeGreaterThan(0);
    expect(culture.flaggedTensions.some((t) => t.involvedFields.includes("seed.threatModel") && t.involvedFields.includes("seed.resourceScarcity"))).toBe(
      true,
    );
  });

  it("does not flag tension for a seed combination with no known tension rule", () => {
    const harmoniousSeed: CultureSeedParams = {
      climate: "temperate",
      resourceScarcity: "abundant",
      threatModel: "isolated",
      kinshipStructure: "non-kin-collective",
      settlementPattern: "fixed-agrarian",
      cosmologyStance: "pantheist",
      technologyLevel: "bronze",
      governmentType: "council",
    };
    const culture = generateCulture(harmoniousSeed, 1);
    expect(culture.flaggedTensions).toEqual([]);
  });

  it("keeps authority/conflict-resolution/inheritance locked to governmentType and kinshipStructure regardless of rng seed", () => {
    for (let salt = 0; salt < 20; salt++) {
      const culture = generateCulture(baseSeed, salt);
      expect(culture.conflictResolutionNorms.derivedFrom).toEqual(["seed.governmentType"]);
      expect(culture.socialStructure.value.authority).toBe(generateCulture(baseSeed, 0).socialStructure.value.authority);
      expect(culture.socialStructure.value.inheritance).toBe(generateCulture(baseSeed, 0).socialStructure.value.inheritance);
    }
  });

  it("keeps the origin narrative's cosmological framing locked to cosmologyStance regardless of rng seed", () => {
    const reference = generateCulture(baseSeed, 0).originNarrative.value;
    for (let salt = 1; salt < 20; salt++) {
      expect(generateCulture(baseSeed, salt).originNarrative.value).toBe(reference);
    }
  });

  it("gives the same culture the same id across generations of the same seed", () => {
    const a = generateCulture(baseSeed, 99);
    const b = generateCulture(baseSeed, 99);
    expect(a.id).toBe(b.id);
  });
});
