import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { generatePantheon } from "../src/lib/pantheon/generate";
import type { CultureProfile } from "../src/lib/types";

export const createPantheon = mutation({
  args: { cultureId: v.id("cultures"), rngSeed: v.optional(v.number()) },
  returns: v.array(v.id("gods")),
  handler: async (ctx, args) => {
    const cultureDoc = await ctx.db.get("cultures", args.cultureId);
    if (!cultureDoc) throw new Error("Culture not found");
    const pantheon = generatePantheon(cultureDoc.data as CultureProfile, args.rngSeed);

    const godIds = [];
    for (const god of pantheon) {
      const godId = await ctx.db.insert("gods", { cultureId: args.cultureId, name: god.name, data: god });
      godIds.push(godId);
    }
    return godIds;
  },
});

export const listByCulture = query({
  args: { cultureId: v.id("cultures") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("gods")
      .withIndex("by_culture", (q) => q.eq("cultureId", args.cultureId))
      .collect();
  },
});
