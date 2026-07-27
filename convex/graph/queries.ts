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

/**
 * Ordered myth-variant lineage for a founding myth (spec Section 8's
 * lineage viewer — "either a diff-style comparison... or a Neo4j graph
 * render"). Same query shape as mythsDerivedFromGod above: origin's variants
 * are exactly the nodes reachable by walking DERIVED_FROM backward from it,
 * and path length is the generation number for free (each hop is one
 * generation of drift). Generation 0 is the founding myth itself.
 */
export const mythLineageChain = action({
  args: { foundingMythId: v.id("myths"), maxGenerations: v.number() },
  returns: v.array(v.object({ mythId: v.string(), generation: v.number() })),
  handler: async (ctx, args) => {
    const maxGen = Math.max(0, Math.min(500, Math.floor(args.maxGenerations)));
    return withSession(async (session) => {
      const result = await session.executeRead((tx) =>
        tx.run(
          `MATCH path = (root:Myth {id: $foundingMythId})<-[:DERIVED_FROM*0..${maxGen}]-(descendant:Myth)
           RETURN DISTINCT descendant.id AS mythId, length(path) AS generation
           ORDER BY generation`,
          { foundingMythId: args.foundingMythId },
        ),
      );
      return result.records.map((r) => ({
        mythId: r.get("mythId") as string,
        generation: Number(r.get("generation")),
      }));
    });
  },
});

/**
 * Pantheon relationship graph (spec Section 8's relationship graph view —
 * gods as nodes, relationships as edges). Scoped to a specific pantheon by
 * passing in that culture's god ids (fetched by the caller via
 * gods.listByCulture) rather than a cultureId property on :God nodes, since
 * syncGodRelationships doesn't currently stamp one.
 */
export const pantheonRelationshipGraph = action({
  args: { godIds: v.array(v.id("gods")) },
  returns: v.array(v.object({ fromId: v.string(), relType: v.string(), toId: v.string() })),
  handler: async (ctx, args) => {
    if (args.godIds.length === 0) return [];
    return withSession(async (session) => {
      const result = await session.executeRead((tx) =>
        tx.run(
          `MATCH (a:God)-[r]->(b:God)
           WHERE a.id IN $godIds AND b.id IN $godIds
           RETURN a.id AS fromId, type(r) AS relType, b.id AS toId`,
          { godIds: args.godIds },
        ),
      );
      return result.records.map((r) => ({
        fromId: r.get("fromId") as string,
        relType: r.get("relType") as string,
        toId: r.get("toId") as string,
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
