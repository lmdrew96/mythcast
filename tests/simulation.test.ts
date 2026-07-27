import { describe, expect, it } from "vitest";
import { generateCulture } from "@/lib/culture/generate";
import { planGeneration, rollProceduralEvent, simulationMutationSeed } from "@/lib/simulation/run";
import type { CultureSeedParams, DriftEvent } from "@/lib/types";

const baseSeed: CultureSeedParams = {
  climate: "temperate",
  resourceScarcity: "moderate",
  threatModel: "isolated",
  kinshipStructure: "clan-based",
  settlementPattern: "fixed-agrarian",
  cosmologyStance: "animist",
  technologyLevel: "iron",
  governmentType: "council",
};

function cultureWith(overrides: Partial<CultureSeedParams>) {
  return generateCulture({ ...baseSeed, ...overrides }, 1);
}

describe("rollProceduralEvent", () => {
  it("is deterministic for the same run seed and generation", () => {
    const culture = cultureWith({});
    const a = rollProceduralEvent(culture, 5, 42);
    const b = rollProceduralEvent(culture, 5, 42);
    expect(a).toEqual(b);
  });

  it("varies across generations for the same run seed", () => {
    const culture = cultureWith({});
    const results = new Set<string>();
    for (let gen = 1; gen <= 30; gen++) {
      results.add(JSON.stringify(rollProceduralEvent(culture, gen, 42)));
    }
    expect(results.size).toBeGreaterThan(1);
  });

  it("fires roughly BASE_EVENT_CHANCE of the time across many generations", () => {
    const culture = cultureWith({});
    let fired = 0;
    const trials = 400;
    for (let gen = 1; gen <= trials; gen++) {
      if (rollProceduralEvent(culture, gen, 7)) fired++;
    }
    const rate = fired / trials;
    expect(rate).toBeGreaterThan(0.2);
    expect(rate).toBeLessThan(0.5);
  });

  it("rival-clans cultures roll war more often than isolated cultures", () => {
    const rivalClans = cultureWith({ threatModel: "rival-clans" });
    const isolated = cultureWith({ threatModel: "isolated" });
    let rivalWars = 0;
    let isolatedWars = 0;
    const trials = 300;
    for (let gen = 1; gen <= trials; gen++) {
      if (rollProceduralEvent(rivalClans, gen, 99)?.type === "war") rivalWars++;
      if (rollProceduralEvent(isolated, gen, 99)?.type === "war") isolatedWars++;
    }
    expect(rivalWars).toBeGreaterThan(isolatedWars);
  });

  it("famine-prone cultures roll famine more often than abundant cultures", () => {
    const famineProne = cultureWith({ resourceScarcity: "famine-prone" });
    const abundant = cultureWith({ resourceScarcity: "abundant" });
    let famineProneFamines = 0;
    let abundantFamines = 0;
    const trials = 300;
    for (let gen = 1; gen <= trials; gen++) {
      if (rollProceduralEvent(famineProne, gen, 13)?.type === "famine") famineProneFamines++;
      if (rollProceduralEvent(abundant, gen, 13)?.type === "famine") abundantFamines++;
    }
    expect(famineProneFamines).toBeGreaterThan(abundantFamines);
  });

  it("nomadic cultures roll migration more often than urban cultures", () => {
    const nomadic = cultureWith({ settlementPattern: "nomadic" });
    const urban = cultureWith({ settlementPattern: "urban" });
    let nomadicMigrations = 0;
    let urbanMigrations = 0;
    const trials = 300;
    for (let gen = 1; gen <= trials; gen++) {
      if (rollProceduralEvent(nomadic, gen, 21)?.type === "migration") nomadicMigrations++;
      if (rollProceduralEvent(urban, gen, 21)?.type === "migration") urbanMigrations++;
    }
    expect(nomadicMigrations).toBeGreaterThan(urbanMigrations);
  });
});

describe("planGeneration", () => {
  it("uses the manual event when one is queued, ignoring any procedural roll", () => {
    const culture = cultureWith({});
    const manual: DriftEvent = { type: "war", generation: 3 };
    const plan = planGeneration(culture, 3, 42, manual);
    expect(plan.event).toEqual(manual);
    expect(plan.source).toBe("manual");
  });

  it("falls back to a procedural roll when no manual event is queued", () => {
    const culture = cultureWith({ threatModel: "rival-clans" });
    // Find a generation known to roll an event for this seed/culture.
    let found = false;
    for (let gen = 1; gen <= 50 && !found; gen++) {
      const plan = planGeneration(culture, gen, 5, null);
      if (plan.event) {
        expect(plan.source).toBe("procedural");
        found = true;
      }
    }
    expect(found).toBe(true);
  });

  it("reports source null on a quiet generation with no manual event and no procedural roll", () => {
    const culture = cultureWith({});
    for (let gen = 1; gen <= 200; gen++) {
      const plan = planGeneration(culture, gen, 5, null);
      if (!plan.event) {
        expect(plan.source).toBeNull();
        return;
      }
    }
    throw new Error("expected at least one quiet generation in 200 rolls");
  });
});

describe("simulationMutationSeed", () => {
  it("is deterministic for the same inputs", () => {
    expect(simulationMutationSeed(42, "myth-abc", 3)).toBe(simulationMutationSeed(42, "myth-abc", 3));
  });

  it("differs across generations, myths, and run seeds", () => {
    const seeds = new Set([
      simulationMutationSeed(42, "myth-abc", 1),
      simulationMutationSeed(42, "myth-abc", 2),
      simulationMutationSeed(42, "myth-xyz", 1),
      simulationMutationSeed(7, "myth-abc", 1),
    ]);
    expect(seeds.size).toBe(4);
  });
});
