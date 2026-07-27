import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";

// Worlds (spec Section 5/7's "syncretism with another culture's telling"):
// a world groups 2+ cultures so contact/migration drift events can
// reference a real second culture instead of a pure flavor label. Optional
// on cultures — a world is opt-in, every pre-existing ungrouped culture is
// unaffected.

export const create = mutation({
  args: { name: v.string() },
  returns: v.id("worlds"),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Must be signed in to create a world");
    return await ctx.db.insert("worlds", { owner: identity.tokenIdentifier, name: args.name, createdAt: Date.now() });
  },
});

/** A signed-in user's worlds, newest first. Returns an empty list when signed out — mirrors cultures.listByOwner. */
export const listByOwner = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    return await ctx.db
      .query("worlds")
      .withIndex("by_owner", (q) => q.eq("owner", identity.tokenIdentifier))
      .order("desc")
      .collect();
  },
});

/** Loads a world and throws unless the caller owns it — mirrors cultures.ts's requireCultureOwner. */
export async function requireWorldOwner(ctx: QueryCtx, worldId: Id<"worlds">): Promise<Doc<"worlds">> {
  const world = await ctx.db.get("worlds", worldId);
  if (!world) throw new Error("World not found");
  const identity = await ctx.auth.getUserIdentity();
  if (!identity || identity.tokenIdentifier !== world.owner) {
    throw new Error("Not authorized to access this world");
  }
  return world;
}

/** The cultures belonging to a world, owner-gated. */
export const listCultures = query({
  args: { worldId: v.id("worlds") },
  handler: async (ctx, args) => {
    await requireWorldOwner(ctx, args.worldId);
    return await ctx.db
      .query("cultures")
      .withIndex("by_world", (q) => q.eq("worldId", args.worldId))
      .collect();
  },
});
