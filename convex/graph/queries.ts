"use node";

// The two example queries spec Section 9 calls out as the reason Neo4j
// exists here at all: "find all myth variants derived from this god within
// N generations" and "show me every culture trait this taboo traces back
// to." The second is implemented as its precise, actually-supported form —
// a culture trait traces back to *seed parameters* in our model (a taboo's
// derivedFrom cites seed keys directly; there's no trait-to-trait chain
// within the culture layer alone), so this answers "every seed param a
// given culture trait (e.g. taboos) traces back to."

import { v } from "convex/values";
import { action } from "../_generated/server";
import { withSession } from "./neo4jClient";

/**
 * Cypher can't parameterize the bound of a variable-length relationship
 * pattern (`*0..$n` is invalid — the bound must be a literal at parse
 * time), so maxGenerations is validated/clamped and interpolated directly
 * into the query text rather than passed as a run parameter. It's a plain
 * number under our control (not a user-supplied string), clamped to a sane
 * range, so this isn't a Cypher-injection concern.
 */
export const mythsDerivedFromGod = action({
  args: { godId: v.id("gods"), maxGenerations: v.number() },
  returns: v.array(v.object({ mythId: v.string(), generationsAway: v.number() })),
  handler: async (ctx, args) => {
    const maxGen = Math.max(0, Math.min(50, Math.floor(args.maxGenerations)));
    return withSession(async (session) => {
      const result = await session.executeRead((tx) =>
        tx.run(
          `MATCH (g:God {id: $godId})-[:HAS_TRAIT]->(:GodTrait)-[:INFLUENCES]->(:MythBeat)<-[:HAS_BEAT]-(origin:Myth)
           MATCH path = (origin)<-[:DERIVED_FROM*0..${maxGen}]-(variant:Myth)
           RETURN DISTINCT variant.id AS mythId, length(path) AS generationsAway
           ORDER BY generationsAway`,
          { godId: args.godId },
        ),
      );
      return result.records.map((r) => ({
        mythId: r.get("mythId") as string,
        generationsAway: Number(r.get("generationsAway")),
      }));
    });
  },
});

export const seedParamsForCultureTrait = action({
  args: { cultureId: v.id("cultures"), field: v.string() },
  returns: v.array(v.string()),
  handler: async (ctx, args) => {
    return withSession(async (session) => {
      const result = await session.executeRead((tx) =>
        tx.run(
          `MATCH (s:SeedParam {cultureId: $cultureId})-[:INFLUENCES]->(:CultureTrait {cultureId: $cultureId, field: $field})
           RETURN DISTINCT s.key AS seedKey`,
          { cultureId: args.cultureId, field: args.field },
        ),
      );
      return result.records.map((r) => r.get("seedKey") as string);
    });
  },
});
