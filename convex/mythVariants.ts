import { v } from "convex/values";
import { action, internalMutation, query } from "./_generated/server";
import { internal, api } from "./_generated/api";
import { driftEventValidator } from "./validators";
import { mutateMyth } from "../src/lib/myth/mutation";
import { requireCultureOwner } from "./cultures";
import type { God, Myth, MythVariant } from "../src/lib/types";
import type { Id } from "./_generated/dataModel";

/** A variant's parent is either an original founding myth (has `.title`) or an earlier variant (drift chains beyond one hop) — mutateMyth only reads `.id`/`.events` off its `parent` argument, so this builds a minimal Myth-shaped view that works for either case. Shared by insertVariant and the Simulation Loop (Phase 8), which advances every myth lineage in a culture one generation at a time. */
export function parentDocToMyth(parentData: Myth | MythVariant, parentDocId: string, cultureId: string, generation: number): Myth {
  return {
    id: "title" in parentData ? parentData.id : parentDocId,
    title: "title" in parentData ? parentData.title : "(variant)",
    events: parentData.events,
    cultureId,
    generation: generation - 1,
  };
}

const createArgs = {
  cultureId: v.id("cultures"),
  parentId: v.union(v.id("myths"), v.id("mythVariants")),
  parentTable: v.union(v.literal("myths"), v.literal("mythVariants")),
  generation: v.number(),
  event: v.optional(driftEventValidator),
  rngSeed: v.optional(v.number()),
};

/** Internal — only ever called via createAndSync's action, which pairs it with the Neo4j lineage edge write (Phase 6's sync pattern). Calling this alone would leave Convex and Neo4j out of sync. */
export const insertVariant = internalMutation({
  args: createArgs,
  returns: v.object({ variantId: v.id("mythVariants"), parentId: v.union(v.id("myths"), v.id("mythVariants")) }),
  handler: async (ctx, args) => {
    const parentDoc =
      args.parentTable === "myths" ? await ctx.db.get("myths", args.parentId as Id<"myths">) : await ctx.db.get("mythVariants", args.parentId as Id<"mythVariants">);
    if (!parentDoc) throw new Error("Parent myth/variant not found");
    const parentData = parentDoc.data as Myth | MythVariant;
    const parentAsMyth = parentDocToMyth(parentData, parentDoc._id, args.cultureId, args.generation);

    const godDocs = await ctx.db
      .query("gods")
      .withIndex("by_culture", (q) => q.eq("cultureId", args.cultureId))
      .collect();
    const pantheon: God[] = godDocs.map((d) => d.data as God);

    const variant = mutateMyth(parentAsMyth, pantheon, args.generation, args.event ?? null, args.rngSeed);

    const variantId = await ctx.db.insert("mythVariants", {
      parentMythId: args.parentId,
      cultureId: args.cultureId,
      generation: args.generation,
      data: variant,
    });

    return { variantId, parentId: args.parentId };
  },
});

/** Public entry point — creates the Convex record and writes the corresponding Neo4j lineage edge in one call, per Phase 6's sync pattern (an action orchestrating a mutation + another action, since mutations can't call actions directly). */
export const createAndSync = action({
  args: createArgs,
  returns: v.id("mythVariants"),
  handler: async (ctx, args) => {
    const result: { variantId: Id<"mythVariants">; parentId: Id<"myths"> | Id<"mythVariants"> } = await ctx.runMutation(
      internal.mythVariants.insertVariant,
      args,
    );
    await ctx.runAction(api.graph.sync.syncMythLineage, { childMythId: result.variantId, parentMythId: result.parentId });
    return result.variantId;
  },
});

export const listByCulture = query({
  args: { cultureId: v.id("cultures") },
  handler: async (ctx, args) => {
    await requireCultureOwner(ctx, args.cultureId);
    return await ctx.db
      .query("mythVariants")
      .withIndex("by_culture", (q) => q.eq("cultureId", args.cultureId))
      .collect();
  },
});
