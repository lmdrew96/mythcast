// Shared Convex argument validators mirroring src/lib/types.ts's enums.
// Convex function args need their own v.* validators (can't just import the
// TS union types), so this is the one place that has to stay in sync with
// CultureSeedParams by hand.

import { v } from "convex/values";

export const cultureSeedParamsValidator = v.object({
  climate: v.union(v.literal("arid"), v.literal("temperate"), v.literal("arctic"), v.literal("tropical"), v.literal("volcanic")),
  resourceScarcity: v.union(v.literal("abundant"), v.literal("moderate"), v.literal("scarce"), v.literal("famine-prone")),
  threatModel: v.union(
    v.literal("isolated"),
    v.literal("rival-clans"),
    v.literal("predators"),
    v.literal("natural-disaster-prone"),
    v.literal("colonizer-pressure"),
  ),
  kinshipStructure: v.union(v.literal("patrilineal"), v.literal("matrilineal"), v.literal("clan-based"), v.literal("non-kin-collective")),
  settlementPattern: v.union(v.literal("nomadic"), v.literal("semi-nomadic"), v.literal("fixed-agrarian"), v.literal("urban")),
  cosmologyStance: v.union(v.literal("animist"), v.literal("polytheist-ancestral"), v.literal("dualist"), v.literal("pantheist"), v.literal("other")),
  technologyLevel: v.union(v.literal("stone"), v.literal("bronze"), v.literal("iron"), v.literal("early-industrial")),
  governmentType: v.union(
    v.literal("chieftain"),
    v.literal("council"),
    v.literal("theocracy"),
    v.literal("hereditary-monarchy"),
    v.literal("stateless-egalitarian"),
  ),
});
