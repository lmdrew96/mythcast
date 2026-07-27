import { v } from "convex/values";
import { action, internalMutation, query } from "./_generated/server";
import { internal, api } from "./_generated/api";
import { mutateMyth } from "../src/lib/myth/mutation";
import type { God, Myth, MythVariant } from "../src/lib/types";
import type { Id } from "./_generated/dataModel";

const driftEventValidator = v.object({
  type: v.union(v.literal("war"), v.literal("famine"), v.literal("migration"), v.literal("contact"), v.literal("disaster")),
  generation: v.number(),
});

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

    // mutateMyth only reads `.id` and `.events` off its `parent` argument —
    // build a minimal Myth-shaped view so it works whether the parent is an
    // original myth or an earlier variant (which has no `.title`).
    const parentAsMyth: Myth = {
      id: "title" in parentData ? parentData.id : parentDoc._id,
      title: "title" in parentData ? parentData.title : "(variant)",
      events: parentData.events,
      cultureId: args.cultureId,
      generation: args.generation - 1,
    };

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
    return await ctx.db
      .query("mythVariants")
      .withIndex("by_culture", (q) => q.eq("cultureId", args.cultureId))
      .collect();
  },
});
