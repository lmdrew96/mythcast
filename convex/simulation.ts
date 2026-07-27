import { v } from "convex/values";
import { action, internalMutation, mutation, query } from "./_generated/server";
import { internal, api } from "./_generated/api";
import { Rng, hashString } from "../src/lib/rng";
import type { ActionCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { planGeneration, simulationMutationSeed } from "../src/lib/simulation/run";
import { mutateMyth } from "../src/lib/myth/mutation";
import { parentDocToMyth } from "./mythVariants";
import type { CultureProfile, God, Myth, MythVariant } from "../src/lib/types";

// Simulation Loop (spec Section 7): generational runs tying Culture ->
// Pantheon -> Myth together via the Mutation/Drift Engine (Phase 7), with
// manual + procedural event injection. Run length is fixed upfront
// (spec: "not an indefinite loop"); the same run seed always reproduces
// the same output given the same injected events (src/lib/simulation/run.ts
// derives every roll and mutation seed from it).

export const startRun = mutation({
  args: { cultureId: v.id("cultures"), totalGenerations: v.number(), seed: v.optional(v.number()) },
  returns: v.id("simulationRuns"),
  handler: async (ctx, args) => {
    if (!Number.isInteger(args.totalGenerations) || args.totalGenerations < 1) {
      throw new Error("totalGenerations must be a positive integer");
    }
    const cultureDoc = await ctx.db.get("cultures", args.cultureId);
    if (!cultureDoc) throw new Error("Culture not found");

    const mythDocs = await ctx.db
      .query("myths")
      .withIndex("by_culture", (q) => q.eq("cultureId", args.cultureId))
      .collect();
    if (mythDocs.length === 0) throw new Error("Culture must have founding myths before a simulation run can start");

    const runId = await ctx.db.insert("simulationRuns", {
      cultureId: args.cultureId,
      seed: args.seed ?? Date.now() >>> 0,
      totalGenerations: args.totalGenerations,
      currentGeneration: 0,
      status: "pending",
      createdAt: Date.now(),
    });

    for (const mythDoc of mythDocs) {
      await ctx.db.insert("simulationLineageHeads", {
        runId,
        foundingMythId: mythDoc._id,
        currentVariantId: mythDoc._id,
        currentTable: "myths",
        generation: 0,
      });
    }

    return runId;
  },
});

/** Queues a manual event for a not-yet-reached generation (spec: "you steer live, dropping in 'a great war happens now' at a specific generation"). Overwrites any previously queued event at that generation so a choice can be corrected before it fires. Wins over any procedural roll at that generation once reached. */
export const injectEvent = mutation({
  args: {
    runId: v.id("simulationRuns"),
    generation: v.number(),
    type: v.union(v.literal("war"), v.literal("famine"), v.literal("migration"), v.literal("contact"), v.literal("disaster")),
    targetCultureId: v.optional(v.id("cultures")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const run = await ctx.db.get("simulationRuns", args.runId);
    if (!run) throw new Error("Run not found");
    if (run.status === "complete") throw new Error("Run is already complete");
    if (args.generation <= run.currentGeneration) throw new Error("Can only inject events at a generation the run hasn't reached yet");
    if (args.generation > run.totalGenerations) throw new Error("Generation is beyond this run's total length");

    let targetCultureId: Id<"cultures"> | undefined;
    if (args.targetCultureId) {
      if (args.type !== "contact" && args.type !== "migration") {
        throw new Error("targetCultureId only applies to contact/migration events");
      }
      const culture = await ctx.db.get("cultures", run.cultureId);
      const target = await ctx.db.get("cultures", args.targetCultureId);
      if (!culture || !target) throw new Error("Culture not found");
      if (!culture.worldId || target.worldId !== culture.worldId) {
        throw new Error("targetCultureId must be a different culture in the same world");
      }
      if (args.targetCultureId === run.cultureId) throw new Error("A culture cannot have contact/migration with itself");
      targetCultureId = args.targetCultureId;
    }

    const existing = await ctx.db
      .query("simulationEvents")
      .withIndex("by_run_and_generation", (q) => q.eq("runId", args.runId).eq("generation", args.generation))
      .unique();
    if (existing) {
      await ctx.db.patch("simulationEvents", existing._id, { type: args.type, source: "manual", targetCultureId });
    } else {
      await ctx.db.insert("simulationEvents", { runId: args.runId, generation: args.generation, type: args.type, source: "manual", targetCultureId });
    }
    return null;
  },
});

const advanceResultValidator = v.array(v.object({ variantId: v.id("mythVariants"), parentId: v.union(v.id("myths"), v.id("mythVariants")) }));

/**
 * Advances one run by exactly one generation: decides the event (manual
 * queued event wins, else a procedural roll), mutates every myth lineage in
 * the culture via the Mutation/Drift Engine, and updates run + lineage-head
 * state. Everything here is plain reads/writes (no Neo4j), so it's one
 * mutation — the calling action pairs each returned pair with a Neo4j
 * lineage-edge sync (which needs the Node runtime and can't happen here).
 */
export const advanceGenerationState = internalMutation({
  args: { runId: v.id("simulationRuns") },
  returns: advanceResultValidator,
  handler: async (ctx, args) => {
    const run = await ctx.db.get("simulationRuns", args.runId);
    if (!run) throw new Error("Run not found");
    if (run.status === "complete") throw new Error("Run is already complete");

    const nextGeneration = run.currentGeneration + 1;

    const cultureDoc = await ctx.db.get("cultures", run.cultureId);
    if (!cultureDoc) throw new Error("Culture not found");
    const culture = cultureDoc.data as CultureProfile;

    const godDocs = await ctx.db
      .query("gods")
      .withIndex("by_culture", (q) => q.eq("cultureId", run.cultureId))
      .collect();
    const pantheon: God[] = godDocs.map((d) => d.data as God);

    const queuedEvent = await ctx.db
      .query("simulationEvents")
      .withIndex("by_run_and_generation", (q) => q.eq("runId", args.runId).eq("generation", nextGeneration))
      .unique();

    const plan = planGeneration(
      culture,
      nextGeneration,
      run.seed,
      queuedEvent ? { type: queuedEvent.type, generation: nextGeneration, targetCultureId: queuedEvent.targetCultureId } : null,
    );

    // A procedural roll never sets a targetCultureId (rollProceduralEvent has
    // no DB access) — if this culture belongs to a world, resolve one now
    // from a sibling culture, deterministically from the run seed so the
    // same seed always reproduces the same run. Manual injections already
    // carry a validated targetCultureId (see injectEvent) and pass through
    // unchanged; a culture with no world (or no siblings) falls back to the
    // pre-multi-culture generic mutation behavior.
    let resolvedEvent = plan.event;
    if (resolvedEvent && (resolvedEvent.type === "contact" || resolvedEvent.type === "migration") && !resolvedEvent.targetCultureId && cultureDoc.worldId) {
      const worldId = cultureDoc.worldId;
      const siblings = await ctx.db
        .query("cultures")
        .withIndex("by_world", (q) => q.eq("worldId", worldId))
        .collect();
      const others = siblings.filter((c) => c._id !== run.cultureId);
      if (others.length > 0) {
        const rng = new Rng(hashString(run.seed + ":target:" + nextGeneration) >>> 0);
        resolvedEvent = { ...resolvedEvent, targetCultureId: rng.pick(others)._id };
      }
    }

    if (plan.source === "procedural" && resolvedEvent) {
      await ctx.db.insert("simulationEvents", {
        runId: args.runId,
        generation: nextGeneration,
        type: resolvedEvent.type,
        source: "procedural",
        targetCultureId: resolvedEvent.targetCultureId as Id<"cultures"> | undefined,
      });
    }

    let foreignPantheon: God[] | undefined;
    if (resolvedEvent?.targetCultureId) {
      const foreignGodDocs = await ctx.db
        .query("gods")
        .withIndex("by_culture", (q) => q.eq("cultureId", resolvedEvent!.targetCultureId as Id<"cultures">))
        .collect();
      foreignPantheon = foreignGodDocs.map((d) => d.data as God);
    }

    const heads = await ctx.db
      .query("simulationLineageHeads")
      .withIndex("by_run", (q) => q.eq("runId", args.runId))
      .collect();

    const results: { variantId: Id<"mythVariants">; parentId: Id<"myths"> | Id<"mythVariants"> }[] = [];

    for (const head of heads) {
      const parentDoc =
        head.currentTable === "myths"
          ? await ctx.db.get("myths", head.currentVariantId as Id<"myths">)
          : await ctx.db.get("mythVariants", head.currentVariantId as Id<"mythVariants">);
      if (!parentDoc) throw new Error("Lineage head points at a missing myth/variant");
      const parentData = parentDoc.data as Myth | MythVariant;
      const parentAsMyth = parentDocToMyth(parentData, parentDoc._id, run.cultureId, nextGeneration);

      const mutationSeed = simulationMutationSeed(run.seed, head.foundingMythId, nextGeneration);
      const variant: MythVariant = mutateMyth(parentAsMyth, pantheon, nextGeneration, resolvedEvent, mutationSeed, foreignPantheon);

      const variantId = await ctx.db.insert("mythVariants", {
        parentMythId: head.currentVariantId,
        cultureId: run.cultureId,
        generation: nextGeneration,
        data: variant,
      });

      await ctx.db.patch("simulationLineageHeads", head._id, {
        currentVariantId: variantId,
        currentTable: "mythVariants",
        generation: nextGeneration,
      });

      results.push({ variantId, parentId: head.currentVariantId });
    }

    await ctx.db.patch("simulationRuns", args.runId, {
      currentGeneration: nextGeneration,
      status: nextGeneration >= run.totalGenerations ? "complete" : "running",
    });

    return results;
  },
});

/** Shared by both advanceGeneration and runToCompletion so neither calls the other as an action within the same (non-Node) runtime — only the Neo4j sync below needs to cross into the Node runtime. */
async function advanceOneGeneration(ctx: ActionCtx, runId: Id<"simulationRuns">): Promise<void> {
  const pairs: { variantId: Id<"mythVariants">; parentId: Id<"myths"> | Id<"mythVariants"> }[] = await ctx.runMutation(
    internal.simulation.advanceGenerationState,
    { runId },
  );
  for (const pair of pairs) {
    await ctx.runAction(api.graph.sync.syncMythLineage, { childMythId: pair.variantId, parentMythId: pair.parentId });
  }
}

/** Steps a run forward by exactly one generation — the "live" mode, so a caller can inject a manual event before advancing into the generation it targets. */
export const advanceGeneration = action({
  args: { runId: v.id("simulationRuns") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await advanceOneGeneration(ctx, args.runId);
    return null;
  },
});

/** Runs a pending/running simulation to completion in one call — the "hands-off" mode for a fully procedural (or already fully-authored) run. */
export const runToCompletion = action({
  args: { runId: v.id("simulationRuns") },
  returns: v.null(),
  handler: async (ctx, args) => {
    let run = await ctx.runQuery(api.simulation.getRun, { runId: args.runId });
    if (!run) throw new Error("Run not found");
    while (run.status !== "complete") {
      await advanceOneGeneration(ctx, args.runId);
      run = await ctx.runQuery(api.simulation.getRun, { runId: args.runId });
      if (!run) throw new Error("Run disappeared mid-execution");
    }
    return null;
  },
});

export const getRun = query({
  args: { runId: v.id("simulationRuns") },
  handler: async (ctx, args) => {
    return await ctx.db.get("simulationRuns", args.runId);
  },
});

/** The run for a given culture — a culture only ever gets one run via the current UI flow. Used to resume a past culture from history (spec: same seed/generation-count/events reproduces the same run, so the resumed state is exactly what was left). */
export const getRunByCulture = query({
  args: { cultureId: v.id("cultures") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("simulationRuns")
      .withIndex("by_culture", (q) => q.eq("cultureId", args.cultureId))
      .order("desc")
      .first();
  },
});

export const listEvents = query({
  args: { runId: v.id("simulationRuns") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("simulationEvents")
      .withIndex("by_run_and_generation", (q) => q.eq("runId", args.runId))
      .collect();
  },
});

export const listLineageHeads = query({
  args: { runId: v.id("simulationRuns") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("simulationLineageHeads")
      .withIndex("by_run", (q) => q.eq("runId", args.runId))
      .collect();
  },
});
