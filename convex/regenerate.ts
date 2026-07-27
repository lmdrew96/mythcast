import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { requireCultureOwner } from "./cultures";

/**
 * Partial regeneration (2026-07-27 DM-worldbuilding gap report, high-value
 * add #7): culture/pantheon/myth generation was previously all-or-nothing —
 * no way to keep a culture you like and reroll everything downstream of it.
 * Deletes the pantheon and everything derived from it (myths, locations,
 * factions, npcs, and any in-progress simulation state) so the client can
 * regenerate a fresh pantheon -> myths -> locations -> factions -> run
 * chain against the SAME culture document. Gods themselves are deleted too
 * (not just their downstream data) since a "reroll pantheon" has to produce
 * an actual new pantheon, not just new myths about the old one.
 */
export const deleteDownstreamOfCulture = mutation({
  args: { cultureId: v.id("cultures") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireCultureOwner(ctx, args.cultureId);

    const runs = await ctx.db
      .query("simulationRuns")
      .withIndex("by_culture", (q) => q.eq("cultureId", args.cultureId))
      .collect();
    for (const run of runs) {
      const events = await ctx.db
        .query("simulationEvents")
        .withIndex("by_run_and_generation", (q) => q.eq("runId", run._id))
        .collect();
      for (const event of events) await ctx.db.delete("simulationEvents", event._id);

      const heads = await ctx.db
        .query("simulationLineageHeads")
        .withIndex("by_run", (q) => q.eq("runId", run._id))
        .collect();
      for (const head of heads) await ctx.db.delete("simulationLineageHeads", head._id);

      await ctx.db.delete("simulationRuns", run._id);
    }

    const variants = await ctx.db
      .query("mythVariants")
      .withIndex("by_culture", (q) => q.eq("cultureId", args.cultureId))
      .collect();
    for (const variant of variants) await ctx.db.delete("mythVariants", variant._id);

    const npcs = await ctx.db
      .query("npcs")
      .withIndex("by_culture", (q) => q.eq("cultureId", args.cultureId))
      .collect();
    for (const npc of npcs) await ctx.db.delete("npcs", npc._id);

    const factions = await ctx.db
      .query("factions")
      .withIndex("by_culture", (q) => q.eq("cultureId", args.cultureId))
      .collect();
    for (const faction of factions) await ctx.db.delete("factions", faction._id);

    const locations = await ctx.db
      .query("locations")
      .withIndex("by_culture", (q) => q.eq("cultureId", args.cultureId))
      .collect();
    for (const location of locations) await ctx.db.delete("locations", location._id);

    const myths = await ctx.db
      .query("myths")
      .withIndex("by_culture", (q) => q.eq("cultureId", args.cultureId))
      .collect();
    for (const myth of myths) await ctx.db.delete("myths", myth._id);

    const gods = await ctx.db
      .query("gods")
      .withIndex("by_culture", (q) => q.eq("cultureId", args.cultureId))
      .collect();
    for (const god of gods) await ctx.db.delete("gods", god._id);

    return null;
  },
});
