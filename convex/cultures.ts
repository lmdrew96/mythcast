import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { cultureSeedParamsValidator } from "./validators";
import { generateCulture } from "../src/lib/culture/generate";

function capitalize(word: string): string {
  return word.length > 0 ? word[0].toUpperCase() + word.slice(1) : word;
}

// Auth is intentionally soft here (falls back to "unauthenticated-dev"
// rather than throwing) — Phase 10 wires real Clerk-authenticated flows
// through the UI; this phase only needs real Convex records to exist so
// Neo4j edges have something to reference, and needs to be callable via
// `npx convex run` (which has no Clerk session) to verify the graph sync.
export const create = mutation({
  args: { seed: cultureSeedParamsValidator, rngSeed: v.optional(v.number()) },
  returns: v.id("cultures"),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const culture = generateCulture(args.seed, args.rngSeed);
    return await ctx.db.insert("cultures", {
      owner: identity?.tokenIdentifier ?? "unauthenticated-dev",
      name: `${capitalize(args.seed.cosmologyStance)} ${capitalize(args.seed.climate)} culture`,
      data: culture,
      createdAt: Date.now(),
    });
  },
});

export const get = query({
  args: { cultureId: v.id("cultures") },
  handler: async (ctx, args) => {
    return await ctx.db.get("cultures", args.cultureId);
  },
});
