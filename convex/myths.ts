import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { generateMyths } from "../src/lib/myth/generate";
import type { CultureProfile, God, Myth } from "../src/lib/types";
import type { Id } from "./_generated/dataModel";

/** Myth event `involvedGodIds` are produced in-memory before persistence, so they hold the generator's internal hash-based god ids, not Convex ids — remap them once the gods are real documents. */
function remapGodIds(myth: Myth, idMap: Record<string, Id<"gods">>): Myth {
  return {
    ...myth,
    events: myth.events.map((event) => ({
      ...event,
      involvedGodIds: event.involvedGodIds.map((id) => idMap[id] ?? id),
    })),
  };
}

export const createMyths = mutation({
  args: { cultureId: v.id("cultures"), rngSeed: v.optional(v.number()) },
  returns: v.array(v.id("myths")),
  handler: async (ctx, args) => {
    const cultureDoc = await ctx.db.get("cultures", args.cultureId);
    if (!cultureDoc) throw new Error("Culture not found");

    const godDocs = await ctx.db
      .query("gods")
      .withIndex("by_culture", (q) => q.eq("cultureId", args.cultureId))
      .collect();
    if (godDocs.length === 0) throw new Error("Pantheon must exist before generating myths");

    const idMap: Record<string, Id<"gods">> = {};
    const pantheon: God[] = godDocs.map((doc) => {
      const god = doc.data as God;
      idMap[god.id] = doc._id;
      return god;
    });

    const myths = generateMyths(cultureDoc.data as CultureProfile, pantheon, args.rngSeed);

    const mythIds = [];
    for (const myth of myths) {
      const remapped = remapGodIds(myth, idMap);
      const mythId = await ctx.db.insert("myths", {
        cultureId: args.cultureId,
        title: remapped.title,
        generation: remapped.generation,
        data: remapped,
      });
      mythIds.push(mythId);
    }
    return mythIds;
  },
});

export const listByCulture = query({
  args: { cultureId: v.id("cultures") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("myths")
      .withIndex("by_culture", (q) => q.eq("cultureId", args.cultureId))
      .collect();
  },
});
