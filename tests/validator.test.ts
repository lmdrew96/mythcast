import { describe, expect, it } from "vitest";
import { generateCulture } from "@/lib/culture/generate";
import { generatePantheon } from "@/lib/pantheon/generate";
import { generateMyths } from "@/lib/myth/generate";
import { validateAll, validateCulture, validatePantheon, validateMyths } from "@/lib/validator";
import type { CultureProfile, CultureSeedParams, God, Myth } from "@/lib/types";

const seed: CultureSeedParams = {
  climate: "volcanic",
  resourceScarcity: "scarce",
  threatModel: "isolated",
  kinshipStructure: "patrilineal",
  settlementPattern: "fixed-agrarian",
  cosmologyStance: "polytheist-ancestral",
  technologyLevel: "iron",
  governmentType: "hereditary-monarchy",
};

describe("validateAll — real generator output", () => {
  it("reports zero bugs across a broad sample of real seeds and rng seeds", () => {
    const seeds: CultureSeedParams[] = [
      seed,
      { ...seed, climate: "tropical", resourceScarcity: "abundant", threatModel: "colonizer-pressure", governmentType: "stateless-egalitarian", kinshipStructure: "non-kin-collective" },
      { ...seed, climate: "arctic", resourceScarcity: "famine-prone", threatModel: "natural-disaster-prone", kinshipStructure: "matrilineal", settlementPattern: "nomadic", governmentType: "theocracy" },
      { ...seed, cosmologyStance: "dualist", governmentType: "council", settlementPattern: "urban", technologyLevel: "early-industrial" },
      { ...seed, cosmologyStance: "pantheist", threatModel: "predators", kinshipStructure: "clan-based" },
    ];
    for (const s of seeds) {
      for (let rngSeed = 0; rngSeed < 6; rngSeed++) {
        const culture = generateCulture(s, rngSeed);
        const pantheon = generatePantheon(culture, rngSeed);
        const myths = generateMyths(culture, pantheon, rngSeed);
        const report = validateAll(culture, pantheon, myths);
        expect(report.bugs, JSON.stringify(report.bugs, null, 2)).toEqual([]);
      }
    }
  });

  it("surfaces real emergent culture tension as flagged, not as a bug", () => {
    const isolatedScarce: CultureSeedParams = { ...seed, threatModel: "isolated", resourceScarcity: "famine-prone" };
    const culture = generateCulture(isolatedScarce, 1);
    const report = validateCulture(culture);
    expect(report.bugs).toEqual([]);
    expect(report.flagged.length).toBeGreaterThan(0);
  });

  it("surfaces a real pantheon personality mismatch as flagged, not as a bug", () => {
    const culture = generateCulture(seed, 1);
    let pantheon = generatePantheon(culture, 0);
    let s = 0;
    while (!pantheon.some((g) => g.personalityMismatch.isMismatch) && s < 50) {
      s++;
      pantheon = generatePantheon(culture, s);
    }
    expect(pantheon.some((g) => g.personalityMismatch.isMismatch)).toBe(true);
    const report = validatePantheon(culture, pantheon);
    expect(report.bugs).toEqual([]);
    expect(report.flagged.some((f) => f.layer === "pantheon")).toBe(true);
  });
});

describe("validateCulture — fabricated contradictions", () => {
  const baseCulture = (): CultureProfile => generateCulture(seed, 1);

  it("does not flag opposed-but-plausible core values as a bug (productive tension, not contradiction)", () => {
    const culture = baseCulture();
    culture.coreValues.value = ["adaptability", "permanence", "resilience"];
    const report = validateCulture(culture);
    expect(report.bugs.some((b) => b.path === "culture.coreValues" && b.message.includes("adaptability"))).toBe(false);
  });

  it("flags a tribute economy under a stateless-egalitarian government", () => {
    const culture = baseCulture();
    culture.economicStructure = { value: "tribute", derivedFrom: ["seed.governmentType"] };
    culture.seed = { ...culture.seed, governmentType: "stateless-egalitarian" };
    const report = validateCulture(culture);
    expect(report.bugs.some((b) => b.message.includes("tribute"))).toBe(true);
  });

  it("flags a gift economy under famine-prone scarcity", () => {
    const culture = baseCulture();
    culture.economicStructure = { value: "gift-economy", derivedFrom: ["seed.resourceScarcity"] };
    culture.seed = { ...culture.seed, resourceScarcity: "famine-prone" };
    const report = validateCulture(culture);
    expect(report.bugs.some((b) => b.message.includes("gift economy"))).toBe(true);
  });

  it("flags an orphan field with empty derivedFrom", () => {
    const culture = baseCulture();
    culture.taboos = { value: ["idleness"], derivedFrom: [] };
    const report = validateCulture(culture);
    expect(report.bugs.some((b) => b.path === "culture.taboos" && b.message.includes("orphan"))).toBe(true);
  });

  it("flags a field whose derivedFrom cites an unrecognized provenance prefix", () => {
    const culture = baseCulture();
    culture.taboos = { value: ["idleness"], derivedFrom: ["culture.coreValues"] };
    const report = validateCulture(culture);
    expect(report.bugs.some((b) => b.path === "culture.taboos" && b.message.includes("unrecognized provenance"))).toBe(true);
  });
});

describe("validatePantheon — fabricated contradictions", () => {
  function makeGod(overrides: Partial<God>): God {
    return {
      id: "god-test-1",
      name: "Testarion",
      domains: { value: ["harvest and fertility"], derivedFrom: ["seed.resourceScarcity"] },
      personality: { value: ["stern", "tribute-demanding", "withholding"], derivedFrom: ["seed.resourceScarcity"] },
      personalityMismatch: { isMismatch: false },
      cultureId: "culture-test",
      ...overrides,
    };
  }

  it("flags an unflagged personality deviation as a bug", () => {
    const culture = generateCulture(seed, 1);
    culture.seed = { ...culture.seed, resourceScarcity: "scarce" };
    const god = makeGod({
      personality: { value: ["gentle", "freely-giving", "generous"], derivedFrom: ["seed.resourceScarcity"] },
      personalityMismatch: { isMismatch: false },
    });
    const report = validatePantheon(culture, [god]);
    expect(report.bugs.some((b) => b.path.includes("personality") && b.message.includes("doesn't match"))).toBe(true);
  });

  it("classifies the same deviation as flagged when isMismatch is true", () => {
    const culture = generateCulture(seed, 1);
    culture.seed = { ...culture.seed, resourceScarcity: "scarce" };
    const god = makeGod({
      personality: { value: ["gentle", "freely-giving", "generous"], derivedFrom: ["seed.resourceScarcity"] },
      personalityMismatch: { isMismatch: true, expectedPersonality: "stern, tribute-demanding, withholding", explanationHook: "no one knows why" },
    });
    const report = validatePantheon(culture, [god]);
    expect(report.bugs.some((b) => b.path.includes("personality") && b.message.includes("doesn't match"))).toBe(false);
    expect(report.flagged.some((f) => f.path.includes("personality"))).toBe(true);
  });

  it("flags a false-positive mismatch (isMismatch true but personality actually matches expectations)", () => {
    const culture = generateCulture(seed, 1);
    culture.seed = { ...culture.seed, resourceScarcity: "scarce" };
    const god = makeGod({
      personality: { value: ["stern", "tribute-demanding", "withholding"], derivedFrom: ["seed.resourceScarcity"] },
      personalityMismatch: { isMismatch: true, expectedPersonality: "stern, tribute-demanding, withholding", explanationHook: "no one knows why" },
    });
    const report = validatePantheon(culture, [god]);
    expect(report.bugs.some((b) => b.message.includes("false alarm") || b.message.includes("doesn't actually differ"))).toBe(true);
  });

  it("flags two gods sharing the same domain", () => {
    const culture = generateCulture(seed, 1);
    const godA = makeGod({ id: "god-a", domains: { value: ["war and protection"], derivedFrom: ["seed.threatModel"] } });
    const godB = makeGod({ id: "god-b", domains: { value: ["war and protection"], derivedFrom: ["seed.threatModel"] } });
    const report = validatePantheon(culture, [godA, godB]);
    expect(report.bugs.some((b) => b.message.includes("more than one god"))).toBe(true);
  });
});

describe("validateMyths — fabricated contradictions", () => {
  const pantheon: God[] = [
    {
      id: "god-1",
      name: "Testarion",
      domains: { value: ["harvest and fertility"], derivedFrom: ["seed.resourceScarcity"] },
      personality: { value: ["stern"], derivedFrom: ["seed.resourceScarcity"] },
      personalityMismatch: { isMismatch: false },
      cultureId: "culture-test",
    },
  ];

  function makeMyth(overrides: Partial<Myth>): Myth {
    return {
      id: "myth-1",
      title: "Test Myth",
      generation: 0,
      cultureId: "culture-test",
      events: [
        { type: "god-acts", description: "x", involvedGodIds: ["god-1"], derivedFrom: ["culture.originNarrative"] },
        { type: "consequence", description: "x", involvedGodIds: ["god-1"], derivedFrom: ["seed.settlementPattern"] },
        { type: "human-response", description: "x", involvedGodIds: ["god-1"], derivedFrom: ["culture.ritualPractices"] },
        { type: "moral-outcome", description: "x", involvedGodIds: ["god-1"], derivedFrom: ["culture.coreValues"] },
      ],
      hookContext: { kind: "origin", godName: "Testarion" },
      ...overrides,
    };
  }

  it("passes a well-formed myth clean", () => {
    const report = validateMyths(pantheon, [makeMyth({})]);
    expect(report.bugs).toEqual([]);
  });

  it("flags a myth with events out of order", () => {
    const myth = makeMyth({});
    myth.events = [myth.events[1], myth.events[0], myth.events[2], myth.events[3]];
    const report = validateMyths(pantheon, [myth]);
    expect(report.bugs.some((b) => b.message.includes("event sequence"))).toBe(true);
  });

  it("flags a myth event referencing a god id not in the pantheon", () => {
    const myth = makeMyth({});
    myth.events[0].involvedGodIds = ["god-does-not-exist"];
    const report = validateMyths(pantheon, [myth]);
    expect(report.bugs.some((b) => b.message.includes("dangling reference"))).toBe(true);
  });

  it("flags a myth event with no derivedFrom", () => {
    const myth = makeMyth({});
    myth.events[0].derivedFrom = [];
    const report = validateMyths(pantheon, [myth]);
    expect(report.bugs.some((b) => b.message.includes("orphan"))).toBe(true);
  });
});
