import { describe, expect, it } from "vitest";
import { generateCulture } from "@/lib/culture/generate";
import { generatePantheon } from "@/lib/pantheon/generate";
import { generateMyths } from "@/lib/myth/generate";
import { mutateMyth } from "@/lib/myth/mutation";
import type { CultureSeedParams, DriftEvent } from "@/lib/types";

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

function setup(rngSeed = 1) {
  const culture = generateCulture(seed, rngSeed);
  const pantheon = generatePantheon(culture, rngSeed);
  const myths = generateMyths(culture, pantheon, rngSeed);
  return { culture, pantheon, myth: myths[0] };
}

describe("mutateMyth", () => {
  it("keeps the same 4-type event sequence as the parent", () => {
    const { pantheon, myth } = setup();
    const variant = mutateMyth(myth, pantheon, 1, { type: "war", generation: 1 });
    expect(variant.events.map((e) => e.type)).toEqual(myth.events.map((e) => e.type));
  });

  it("is deterministic for the same parent, generation, event, and rng seed", () => {
    const { pantheon, myth } = setup();
    const event: DriftEvent = { type: "war", generation: 1 };
    const a = mutateMyth(myth, pantheon, 1, event, 42);
    const b = mutateMyth(myth, pantheon, 1, event, 42);
    expect(a).toEqual(b);
  });

  it("applies exactly one event-biased operation when an event is passed, plus optionally decay", () => {
    const { pantheon, myth } = setup();
    const event: DriftEvent = { type: "war", generation: 1 };
    for (let s = 0; s < 20; s++) {
      const variant = mutateMyth(myth, pantheon, 1, event, s);
      const eventBiasedCount = variant.mutationOperations.filter((op) => op !== "omission").length;
      expect(eventBiasedCount).toBe(1);
      expect(variant.mutationOperations.length).toBeLessThanOrEqual(2);
    }
  });

  it("applies no event-biased operation when event is null, only occasional decay", () => {
    const { pantheon, myth } = setup();
    for (let s = 0; s < 20; s++) {
      const variant = mutateMyth(myth, pantheon, 1, null, s);
      const eventBiasedCount = variant.mutationOperations.filter((op) => op !== "omission").length;
      expect(eventBiasedCount).toBe(0);
    }
  });

  it("still produces at least some drift over many quiet generations (decay eventually fires)", () => {
    const { pantheon, myth } = setup();
    let anyDecay = false;
    for (let s = 0; s < 60; s++) {
      const variant = mutateMyth(myth, pantheon, 1, null, s);
      if (variant.mutationOperations.includes("omission")) anyDecay = true;
    }
    expect(anyDecay).toBe(true);
  });

  it("produces a diff whose changed flags agree with actual before/after differences", () => {
    const { pantheon, myth } = setup();
    const event: DriftEvent = { type: "migration", generation: 1 };
    for (let s = 0; s < 10; s++) {
      const variant = mutateMyth(myth, pantheon, 1, event, s);
      for (const d of variant.diff) {
        const actuallyChanged = d.before.description !== d.after.description || JSON.stringify(d.before.involvedGodIds) !== JSON.stringify(d.after.involvedGodIds);
        expect(d.changed).toBe(actuallyChanged);
      }
      // At least one event should show real drift since an event fired.
      expect(variant.diff.some((d) => d.changed)).toBe(true);
    }
  });

  it("keeps every involvedGodIds reference pointing at a real pantheon member after mutation", () => {
    const { pantheon, myth } = setup();
    const ids = new Set(pantheon.map((g) => g.id));
    for (const type of ["war", "famine", "migration", "contact", "disaster"] as const) {
      for (let s = 0; s < 10; s++) {
        const variant = mutateMyth(myth, pantheon, 1, { type, generation: 1 }, s);
        for (const e of variant.events) {
          for (const id of e.involvedGodIds) {
            expect(ids.has(id)).toBe(true);
          }
        }
      }
    }
  });

  it("conflation reduces the count of distinct gods referenced (when it fires on a myth with 2+ gods)", () => {
    const { culture, pantheon } = setup(1);
    // Build a synthetic myth referencing two distinct gods so conflation has something to merge.
    const [godA, godB] = pantheon;
    const myth = {
      id: "myth-synthetic",
      title: "Synthetic",
      cultureId: culture.id,
      generation: 0,
      events: [
        { type: "god-acts" as const, description: `${godA.name} did a thing.`, involvedGodIds: [godA.id], derivedFrom: ["culture.originNarrative"] },
        { type: "consequence" as const, description: `${godB.name} noticed.`, involvedGodIds: [godB.id], derivedFrom: ["seed.settlementPattern"] },
        { type: "human-response" as const, description: `The people watched ${godA.name} and ${godB.name}.`, involvedGodIds: [godA.id, godB.id], derivedFrom: ["culture.ritualPractices"] },
        { type: "moral-outcome" as const, description: "A lesson.", involvedGodIds: [godA.id], derivedFrom: ["culture.coreValues"] },
      ],
    };

    let conflationSeen = false;
    for (let s = 0; s < 40 && !conflationSeen; s++) {
      const variant = mutateMyth(myth, pantheon, 1, { type: "migration", generation: 1 }, s);
      if (variant.mutationOperations.includes("conflation")) {
        conflationSeen = true;
        const distinctAfter = new Set(variant.events.flatMap((e) => e.involvedGodIds));
        expect(distinctAfter.size).toBeLessThan(2);
      }
    }
    expect(conflationSeen).toBe(true);
  });

  it("without a foreignPantheon, contact/migration fall back to the generic event-biased operations (pre-multi-culture behavior)", () => {
    const { pantheon, myth } = setup();
    for (const type of ["contact", "migration"] as const) {
      for (let s = 0; s < 20; s++) {
        const variant = mutateMyth(myth, pantheon, 1, { type, generation: 1 }, s);
        expect(variant.mutationOperations).not.toContain("syncretism");
      }
    }
  });

  it("with a foreignPantheon, contact/migration produce a real syncretism naming an actual foreign god", () => {
    const { pantheon, myth } = setup(2);
    const foreignPantheon = generatePantheon(generateCulture(seed, 99), 99);
    for (const type of ["contact", "migration"] as const) {
      const variant = mutateMyth(myth, pantheon, 1, { type, generation: 1 }, 7, foreignPantheon);
      expect(variant.mutationOperations).toContain("syncretism");
      const foreignGodNamed = foreignPantheon.some((g) => variant.events.some((e) => e.description.includes(g.name)));
      expect(foreignGodNamed).toBe(true);
    }
  });

  it("does not use syncretism when foreignPantheon is empty", () => {
    const { pantheon, myth } = setup();
    const variant = mutateMyth(myth, pantheon, 1, { type: "contact", generation: 1 }, 7, []);
    expect(variant.mutationOperations).not.toContain("syncretism");
  });
});
