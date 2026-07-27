import { describe, expect, it } from "vitest";
import { generateCulture } from "@/lib/culture/generate";
import { generatePantheon } from "@/lib/pantheon/generate";
import { generateMyths } from "@/lib/myth/generate";
import { generateAdventureHook } from "@/lib/myth/hooks";
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

describe("generateAdventureHook", () => {
  it("gives every generated myth a non-empty, distinct one-line hook", () => {
    const culture = generateCulture(seed, 1);
    const pantheon = generatePantheon(culture, 1);
    const myths = generateMyths(culture, pantheon, 1);
    expect(myths.length).toBeGreaterThan(0);
    for (const myth of myths) {
      const hook = generateAdventureHook(myth);
      expect(hook.length).toBeGreaterThan(0);
    }
  });

  it("origin hook names the god from hookContext", () => {
    const hook = generateAdventureHook({ hookContext: { kind: "origin", godName: "Marekh" } });
    expect(hook).toContain("Marekh");
  });

  it("cautionary hook names the taboo and offender", () => {
    const hook = generateAdventureHook({ hookContext: { kind: "cautionary", godName: "Sten", taboo: "eating alone", offender: "Odu" } });
    expect(hook).toContain("eating alone");
    expect(hook).toContain("Odu");
  });

  it("mismatch hook names the god and witness", () => {
    const hook = generateAdventureHook({ hookContext: { kind: "mismatch", godName: "Vael", witness: "Isra" } });
    expect(hook).toContain("Vael");
    expect(hook).toContain("Isra");
  });

  it("tension hook names the god and seeker", () => {
    const hook = generateAdventureHook({ hookContext: { kind: "tension", godName: "Corr", seeker: "Bael" } });
    expect(hook).toContain("Corr");
    expect(hook).toContain("Bael");
  });

  it("relationship hook varies by relationship type and names both gods", () => {
    const rival = generateAdventureHook({ hookContext: { kind: "relationship", relationshipType: "rival-of", fromName: "A", toName: "B" } });
    const parent = generateAdventureHook({ hookContext: { kind: "relationship", relationshipType: "parent-of", fromName: "A", toName: "B" } });
    const consort = generateAdventureHook({ hookContext: { kind: "relationship", relationshipType: "consort-of", fromName: "A", toName: "B" } });
    const usurped = generateAdventureHook({ hookContext: { kind: "relationship", relationshipType: "usurped-by", fromName: "A", toName: "B" } });
    const hooks = [rival, parent, consort, usurped];
    for (const hook of hooks) {
      expect(hook).toContain("A");
      expect(hook).toContain("B");
    }
    expect(new Set(hooks).size).toBe(4);
  });
});
