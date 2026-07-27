import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { generateLocations } from "../src/lib/culture/locations";
import { requireCultureOwner } from "./cultures";
import type { CultureProfile, Myth } from "../src/lib/types";

export const createLocations = mutation({
  args: { cultureId: v.id("cultures"), rngSeed: v.optional(v.number()) },
  returns: v.array(v.id("locations")),
  handler: async (ctx, args) => {
    const cultureDoc = await ctx.db.get("cultures", args.cultureId);
    if (!cultureDoc) throw new Error("Culture not found");

    const mythDocs = await ctx.db
      .query("myths")
      .withIndex("by_culture", (q) => q.eq("cultureId", args.cultureId))
      .collect();
    if (mythDocs.length === 0) throw new Error("Founding myths must exist before generating locations");

    const myths: Myth[] = mythDocs.map((doc) => doc.data as Myth);
    const locations = generateLocations(cultureDoc.data as CultureProfile, myths, args.rngSeed);

    const locationIds = [];
    for (const location of locations) {
      const locationId = await ctx.db.insert("locations", {
        cultureId: args.cultureId,
        name: location.name,
        kind: location.kind,
        data: location,
      });
      locationIds.push(locationId);
    }
    return locationIds;
  },
});

export const listByCulture = query({
  args: { cultureId: v.id("cultures") },
  handler: async (ctx, args) => {
    await requireCultureOwner(ctx, args.cultureId);
    return await ctx.db
      .query("locations")
      .withIndex("by_culture", (q) => q.eq("cultureId", args.cultureId))
      .collect();
  },
});
