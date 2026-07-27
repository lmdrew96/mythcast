import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { mythToProse, mythVariantToProse } from "../src/lib/codex/prose";
import type { Doc, Id } from "./_generated/dataModel";
import type { Myth, MythVariant } from "../src/lib/types";

type LineageChainLink = { mythId: string; generation: number };

type LineageEntry = {
  generation: number;
  title: string;
  paragraph: string;
  mutationOperations: string[];
  triggeringEventId: string | null;
  diff: MythVariant["diff"] | null;
};

type RelationshipEdge = { fromId: string; toId: string; relType: string };

// Lineage viewer (spec Section 8): a diff-style comparison across a myth's
// drift history, one of the two forms spec explicitly allows ("either a
// diff-style comparison between generation snapshots, or a Neo4j graph
// render"). The ordered chain of variant ids comes from the Neo4j
// DERIVED_FROM edges (graph.queries.mythLineageChain); each variant's own
// `diff` field (already computed at mutation time by the Mutation/Drift
// Engine) is reused as-is rather than recomputed.

/** Returns Convex's loosely-typed generator payloads (`data: v.any()` in schema.ts) as-is, matching that existing convention rather than re-specifying every nested field here. */
export const getLineageView = action({
  args: { foundingMythId: v.id("myths"), maxGenerations: v.optional(v.number()) },
  returns: v.array(v.any()),
  handler: async (ctx, args): Promise<LineageEntry[]> => {
    const foundingDoc: Doc<"myths"> | null = await ctx.runQuery(api.myths.get, { mythId: args.foundingMythId });
    if (!foundingDoc) throw new Error("Founding myth not found");
    const foundingMyth = foundingDoc.data as Myth;

    const chain: LineageChainLink[] = await ctx.runAction(api.graph.queries.mythLineageChain, {
      foundingMythId: args.foundingMythId,
      maxGenerations: args.maxGenerations ?? 500,
    });

    const variantDocs: Doc<"mythVariants">[] = await ctx.runQuery(api.mythVariants.listByCulture, { cultureId: foundingDoc.cultureId });
    const variantById = new Map<string, MythVariant>(variantDocs.map((doc) => [doc._id as string, doc.data as MythVariant]));

    const entries: (LineageEntry | null)[] = chain.map((link) => {
      if (link.mythId === (args.foundingMythId as string)) {
        return {
          generation: 0,
          title: foundingMyth.title,
          paragraph: mythToProse(foundingMyth).paragraph,
          mutationOperations: [],
          triggeringEventId: null,
          diff: null,
        };
      }
      const variant = variantById.get(link.mythId);
      if (!variant) return null;
      const prose = mythVariantToProse(variant, foundingMyth.title);
      return {
        generation: link.generation,
        title: prose.title,
        paragraph: prose.paragraph,
        mutationOperations: variant.mutationOperations,
        triggeringEventId: variant.triggeringEventId ?? null,
        diff: variant.diff,
      };
    });

    return entries.filter((entry): entry is LineageEntry => entry !== null).sort((a, b) => a.generation - b.generation);
  },
});

export const getRelationshipGraph = action({
  args: { cultureId: v.id("cultures") },
  returns: v.object({
    nodes: v.array(v.object({ id: v.string(), name: v.string() })),
    edges: v.array(v.object({ fromId: v.string(), toId: v.string(), relType: v.string() })),
  }),
  handler: async (ctx, args): Promise<{ nodes: { id: string; name: string }[]; edges: RelationshipEdge[] }> => {
    const godDocs: Doc<"gods">[] = await ctx.runQuery(api.gods.listByCulture, { cultureId: args.cultureId });
    const godIds: Id<"gods">[] = godDocs.map((doc) => doc._id);
    const edges: RelationshipEdge[] = await ctx.runAction(api.graph.queries.pantheonRelationshipGraph, { godIds });

    return {
      nodes: godDocs.map((doc) => ({ id: doc._id, name: doc.name })),
      edges,
    };
  },
});
