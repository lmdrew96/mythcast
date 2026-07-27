import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Phase 0 stub schema — table shapes get fleshed out as each generator
// lands (Culture Generator = Phase 2, Pantheon = Phase 3, Myth = Phase 4).
// `data` is v.any() for now since the concrete field set is still owned by
// src/lib/types.ts during early development; tighten these once a layer's
// shape stabilizes.

export default defineSchema({
  // A world groups 2+ cultures so contact/migration drift events can
  // reference a real second culture instead of being a pure flavor label
  // (spec Section 5/7's "syncretism with another culture's telling").
  // Optional on cultures below so every pre-existing, ungrouped culture is
  // unaffected — a world is opt-in, not a required wrapper.
  worlds: defineTable({
    owner: v.string(), // Clerk user id
    name: v.string(),
    createdAt: v.number(),
  }).index("by_owner", ["owner"]),

  cultures: defineTable({
    owner: v.string(), // Clerk user id
    name: v.string(),
    data: v.any(), // CultureProfile
    createdAt: v.number(),
    worldId: v.optional(v.id("worlds")),
  })
    .index("by_owner", ["owner"])
    .index("by_world", ["worldId"]),

  gods: defineTable({
    cultureId: v.id("cultures"),
    name: v.string(),
    data: v.any(), // God
  }).index("by_culture", ["cultureId"]),

  myths: defineTable({
    cultureId: v.id("cultures"),
    title: v.string(),
    generation: v.number(),
    data: v.any(), // Myth
  }).index("by_culture", ["cultureId"]),

  // Named, traceable places synthesized from culture + founding-myth data
  // (spec-adjacent DM-worldbuilding add: a settlementPattern category alone
  // gives a DM nothing to put a pin on).
  locations: defineTable({
    cultureId: v.id("cultures"),
    name: v.string(),
    kind: v.union(v.literal("capital"), v.literal("sacred-site"), v.literal("taboo-site")),
    data: v.any(), // Location
  }).index("by_culture", ["cultureId"]),

  mythVariants: defineTable({
    // A variant's parent is either the original founding myth (generation 1)
    // or an earlier variant (generation 2+, drift chains beyond one hop) —
    // Phase 7's Mutation/Drift Engine produces multi-generation lineages.
    parentMythId: v.union(v.id("myths"), v.id("mythVariants")),
    cultureId: v.id("cultures"),
    generation: v.number(),
    data: v.any(), // MythVariant
  })
    .index("by_parent", ["parentMythId"])
    .index("by_culture", ["cultureId"]),

  // Phase 8 (Simulation Loop, spec Section 7): a bounded, user-defined-length
  // generational run tying a culture's myths to the Mutation/Drift Engine.
  simulationRuns: defineTable({
    cultureId: v.id("cultures"),
    seed: v.number(), // drives every procedural roll + mutation seed this run makes — same seed reproduces the same run (spec: reproducibility requirement)
    totalGenerations: v.number(), // set upfront, not an indefinite loop (spec)
    currentGeneration: v.number(), // 0 = not yet advanced
    status: v.union(v.literal("pending"), v.literal("running"), v.literal("complete")),
    createdAt: v.number(),
  }).index("by_culture", ["cultureId"]),

  // One row per generation an event fired (manual or procedural) — kept as
  // its own table rather than an array on simulationRuns per the "don't
  // store unbounded lists on a document" schema guideline, and doubles as
  // the run's event log for the lineage viewer (Phase 10).
  simulationEvents: defineTable({
    runId: v.id("simulationRuns"),
    generation: v.number(),
    type: v.union(v.literal("war"), v.literal("famine"), v.literal("migration"), v.literal("contact"), v.literal("disaster")),
    source: v.union(v.literal("manual"), v.literal("procedural")),
    // The real second culture a contact/migration event references — unset
    // for war/famine/disaster, and for contact/migration on a culture with
    // no world (falls back to the pre-multi-culture generic behavior).
    targetCultureId: v.optional(v.id("cultures")),
  }).index("by_run_and_generation", ["runId", "generation"]),

  // One row per founding myth in the run's culture, tracking the current tip
  // of that myth's drift lineage so each generation's mutation knows what to
  // mutate from next. Updated in place each generation rather than
  // recomputed by walking the mythVariants chain every time.
  simulationLineageHeads: defineTable({
    runId: v.id("simulationRuns"),
    foundingMythId: v.id("myths"),
    currentVariantId: v.union(v.id("myths"), v.id("mythVariants")),
    currentTable: v.union(v.literal("myths"), v.literal("mythVariants")),
    generation: v.number(),
  }).index("by_run", ["runId"]),
});
