import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Phase 0 stub schema — table shapes get fleshed out as each generator
// lands (Culture Generator = Phase 2, Pantheon = Phase 3, Myth = Phase 4).
// `data` is v.any() for now since the concrete field set is still owned by
// src/lib/types.ts during early development; tighten these once a layer's
// shape stabilizes.

export default defineSchema({
  cultures: defineTable({
    owner: v.string(), // Clerk user id
    name: v.string(),
    data: v.any(), // CultureProfile
    createdAt: v.number(),
  }).index("by_owner", ["owner"]),

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
});
