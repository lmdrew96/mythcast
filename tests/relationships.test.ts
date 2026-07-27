import { describe, expect, it } from "vitest";
import { generateCulture } from "@/lib/culture/generate";
import { generatePantheon } from "@/lib/pantheon/generate";
import { generateGodRelationships } from "@/lib/pantheon/relationships";
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

describe("generateGodRelationships", () => {
  it("returns no relationships for a pantheon smaller than 2", () => {
    expect(generateGodRelationships([])).toEqual([]);
  });

  it("never relates a god to itself", () => {
    const culture = generateCulture(seed, 1);
    const pantheon = generatePantheon(culture, 1);
    for (let s = 0; s < 10; s++) {
      const rels = generateGodRelationships(pantheon, s);
      for (const r of rels) {
        expect(r.fromGodId).not.toBe(r.toGodId);
      }
    }
  });

  it("never generates the same unordered pair twice in one call", () => {
    const culture = generateCulture(seed, 1);
    const pantheon = generatePantheon(culture, 1);
    for (let s = 0; s < 10; s++) {
      const rels = generateGodRelationships(pantheon, s);
      const pairKeys = rels.map((r) => [r.fromGodId, r.toGodId].sort().join("|"));
      expect(new Set(pairKeys).size).toBe(pairKeys.length);
    }
  });

  it("only references god ids that are actually in the pantheon", () => {
    const culture = generateCulture(seed, 1);
    const pantheon = generatePantheon(culture, 1);
    const ids = new Set(pantheon.map((g) => g.id));
    const rels = generateGodRelationships(pantheon, 3);
    for (const r of rels) {
      expect(ids.has(r.fromGodId)).toBe(true);
      expect(ids.has(r.toGodId)).toBe(true);
    }
  });

  it("only produces the four defined relationship types", () => {
    const culture = generateCulture(seed, 1);
    const pantheon = generatePantheon(culture, 1);
    const allowed = new Set(["parent-of", "rival-of", "consort-of", "usurped-by"]);
    for (let s = 0; s < 10; s++) {
      for (const r of generateGodRelationships(pantheon, s)) {
        expect(allowed.has(r.type)).toBe(true);
      }
    }
  });

  it("is deterministic for the same pantheon and rng seed", () => {
    const culture = generateCulture(seed, 1);
    const pantheon = generatePantheon(culture, 1);
    const a = generateGodRelationships(pantheon, 4);
    const b = generateGodRelationships(pantheon, 4);
    expect(a).toEqual(b);
  });

  it("traces every relationship back to the involved gods' domains/personality", () => {
    const culture = generateCulture(seed, 1);
    const pantheon = generatePantheon(culture, 1);
    const rels = generateGodRelationships(pantheon, 2);
    for (const r of rels) {
      expect(r.derivedFrom.length).toBeGreaterThan(0);
      for (const cause of r.derivedFrom) {
        expect(cause).toMatch(/^god:/);
      }
    }
  });
});
