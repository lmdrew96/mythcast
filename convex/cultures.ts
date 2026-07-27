import { v } from "convex/values";
import { action, mutation, query } from "./_generated/server";
import { api } from "./_generated/api";
import { cultureSeedParamsValidator } from "./validators";
import { generateCulture } from "../src/lib/culture/generate";
import { requireWorldOwner } from "./worlds";
import type { Doc, Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";

function capitalize(word: string): string {
  return word.length > 0 ? word[0].toUpperCase() + word.slice(1) : word;
}

// Auth is intentionally soft here (falls back to "unauthenticated-dev"
// rather than throwing) — Phase 10 wires real Clerk-authenticated flows
// through the UI; this phase only needs real Convex records to exist so
// Neo4j edges have something to reference, and needs to be callable via
// `npx convex run` (which has no Clerk session) to verify the graph sync.
export const create = mutation({
  args: { seed: cultureSeedParamsValidator, rngSeed: v.optional(v.number()), worldId: v.optional(v.id("worlds")) },
  returns: v.id("cultures"),
  handler: async (ctx, args) => {
    if (args.worldId) await requireWorldOwner(ctx, args.worldId);
    const identity = await ctx.auth.getUserIdentity();
    const culture = generateCulture(args.seed, args.rngSeed);
    return await ctx.db.insert("cultures", {
      owner: identity?.tokenIdentifier ?? "unauthenticated-dev",
      name: `${capitalize(args.seed.cosmologyStance)} ${capitalize(args.seed.climate)} culture`,
      data: culture,
      createdAt: Date.now(),
      worldId: args.worldId,
    });
  },
});

/**
 * Loads a culture and throws unless the caller is its owner — the single
 * ownership check shared by every query/action that reads culture-scoped
 * data (gods, myths, mythVariants, codex export). Mirrors `create`'s own
 * identity-or-"unauthenticated-dev" fallback so the `npx convex run` dev
 * path (no Clerk session) still works against dev-created fixtures.
 */
export async function requireCultureOwner(ctx: QueryCtx, cultureId: Id<"cultures">): Promise<Doc<"cultures">> {
  const culture = await ctx.db.get("cultures", cultureId);
  if (!culture) throw new Error("Culture not found");
  const identity = await ctx.auth.getUserIdentity();
  const caller = identity?.tokenIdentifier ?? "unauthenticated-dev";
  if (caller !== culture.owner) throw new Error("Not authorized to access this culture");
  return culture;
}

export const get = query({
  args: { cultureId: v.id("cultures") },
  handler: async (ctx, args) => {
    return await requireCultureOwner(ctx, args.cultureId);
  },
});

/** A signed-in user's past cultures, newest first — lets the world/page.tsx UI offer a "your worlds" history instead of losing everything on refresh. Returns an empty list when signed out. */
export const listByOwner = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    return await ctx.db
      .query("cultures")
      .withIndex("by_owner", (q) => q.eq("owner", identity.tokenIdentifier))
      .order("desc")
      .collect();
  },
});

/** Reloads everything world/page.tsx needs to resume a past culture from history — its founding myths and (if one exists) its simulation run's completion state. An action (not a query) since it's called imperatively from a click handler, not subscribed to reactively. */
export const loadForResume = action({
  args: { cultureId: v.id("cultures") },
  returns: v.object({
    mythIds: v.array(v.id("myths")),
    runId: v.union(v.id("simulationRuns"), v.null()),
    simulationDone: v.boolean(),
  }),
  handler: async (
    ctx,
    args,
  ): Promise<{ mythIds: Id<"myths">[]; runId: Id<"simulationRuns"> | null; simulationDone: boolean }> => {
    const myths: Doc<"myths">[] = await ctx.runQuery(api.myths.listByCulture, { cultureId: args.cultureId });
    const run: Doc<"simulationRuns"> | null = await ctx.runQuery(api.simulation.getRunByCulture, { cultureId: args.cultureId });
    return {
      mythIds: myths.map((m) => m._id) as Id<"myths">[],
      runId: run?._id ?? null,
      simulationDone: run?.status === "complete",
    };
  },
});
