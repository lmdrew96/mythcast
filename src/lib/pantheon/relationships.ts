// God-to-god relationships (spec Section 8: "gods as nodes, relationships
// (parent-of, rival-of, consort-of, usurped-by) as edges"). Nothing upstream
// generates these yet — Phase 3's Pantheon Generator produces independent
// gods with domain/personality, not relational structure between them — and
// the Neo4j layer's acceptance criteria requires actual god-to-god edges to
// sync, so that generation has to live somewhere. It lives here rather than
// in pantheon/generate.ts since it's a distinct concern (relational
// structure, not god generation) that the graph layer is what actually
// consumes.
//
// Deliberately small: a handful of relationships per pantheon, weighted
// (not forced) toward thematically-compatible domains for parent-of/
// consort-of and opposed personality traits for rival-of, using the same
// domain-compatibility and trait-opposite data the Pantheon Generator
// already built (domains.ts) rather than inventing a parallel rule set.

import { Rng, hashString } from "../rng";
import { compatibleDomainsFor, TRAIT_OPPOSITES } from "./domains";
import type { God } from "../types";

export type GodRelationshipType = "parent-of" | "rival-of" | "consort-of" | "usurped-by";

export type GodRelationship = {
  type: GodRelationshipType;
  fromGodId: string;
  toGodId: string;
  derivedFrom: string[];
};

function domainsAreCompatible(a: God, b: God): boolean {
  return a.domains.value.some((d) => compatibleDomainsFor(d).some((c) => b.domains.value.includes(c)));
}

function traitsOppose(a: God, b: God): boolean {
  return a.personality.value.some((t) => TRAIT_OPPOSITES[t] !== undefined && b.personality.value.includes(TRAIT_OPPOSITES[t]));
}

function pickRelationshipType(rng: Rng, a: God, b: God): GodRelationshipType {
  const compatible = domainsAreCompatible(a, b);
  const opposed = traitsOppose(a, b);
  const weights: Record<GodRelationshipType, number> = {
    "parent-of": 1 + (compatible ? 4 : 0),
    "consort-of": 1 + (compatible ? 3 : 0),
    "rival-of": 1 + (opposed ? 5 : 0),
    "usurped-by": 1,
  };
  return rng.weightedPick(Object.keys(weights) as GodRelationshipType[], (t) => weights[t]);
}

export function relationshipRngSeed(pantheon: God[], salt = 0): number {
  return hashString(pantheon.map((g) => g.id).join(",") + ":relationships:" + salt) >>> 0;
}

export function generateGodRelationships(pantheon: God[], rngSeed?: number): GodRelationship[] {
  if (pantheon.length < 2) return [];
  const rng = new Rng(rngSeed ?? relationshipRngSeed(pantheon));

  const count = Math.min(pantheon.length - 1, rng.int(1, 3));
  const usedPairs = new Set<string>();
  const relationships: GodRelationship[] = [];

  let attempts = 0;
  while (relationships.length < count && attempts < count * 15) {
    attempts++;
    const a = rng.pick(pantheon);
    const b = rng.pick(pantheon);
    if (a.id === b.id) continue;
    const pairKey = [a.id, b.id].sort().join("|");
    if (usedPairs.has(pairKey)) continue;
    usedPairs.add(pairKey);

    const type = pickRelationshipType(rng, a, b);
    const [from, to] = rng.chance(0.5) ? [a, b] : [b, a];
    relationships.push({
      type,
      fromGodId: from.id,
      toGodId: to.id,
      derivedFrom: [`god:${a.id}.domains`, `god:${b.id}.domains`, `god:${a.id}.personality`, `god:${b.id}.personality`],
    });
  }

  return relationships;
}
