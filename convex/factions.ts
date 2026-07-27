import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { generateFactions } from "../src/lib/culture/factions";
import { requireCultureOwner } from "./cultures";
import type { CultureProfile, Myth } from "../src/lib/types";

export const createFactions = mutation({
  args: { cultureId: v.id("cultures"), rngSeed: v.optional(v.number()) },
  returns: v.array(v.id("factions")),
  handler: async (ctx, args) => {
    const cultureDoc = await ctx.db.get("cultures", args.cultureId);
    if (!cultureDoc) throw new Error("Culture not found");

    const mythDocs = await ctx.db
      .query("myths")
      .withIndex("by_culture", (q) => q.eq("cultureId", args.cultureId))
      .collect();
    if (mythDocs.length === 0) throw new Error("Founding myths must exist before generating factions");

    const myths: Myth[] = mythDocs.map((doc) => doc.data as Myth);
    const factions = generateFactions(cultureDoc.data as CultureProfile, myths, args.rngSeed);

    const factionIds = [];
    for (const faction of factions) {
      const factionId = await ctx.db.insert("factions", {
        cultureId: args.cultureId,
        name: faction.name,
        data: faction,
      });
      factionIds.push(factionId);
    }
    return factionIds;
  },
});

export const listByCulture = query({
  args: { cultureId: v.id("cultures") },
  handler: async (ctx, args) => {
    await requireCultureOwner(ctx, args.cultureId);
    return await ctx.db
      .query("factions")
      .withIndex("by_culture", (q) => q.eq("cultureId", args.cultureId))
      .collect();
  },
});
