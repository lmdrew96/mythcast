import { v } from "convex/values";
import { query } from "./_generated/server";
import { requireCultureOwner } from "./cultures";

export const listByCulture = query({
  args: { cultureId: v.id("cultures") },
  handler: async (ctx, args) => {
    await requireCultureOwner(ctx, args.cultureId);
    return await ctx.db
      .query("npcs")
      .withIndex("by_culture", (q) => q.eq("cultureId", args.cultureId))
      .collect();
  },
});
