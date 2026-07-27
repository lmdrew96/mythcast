// Core data model — spec sections 3 (Culture), 4 (Pantheon), 5 (Myth).
// Shapes here are stub-complete for Phase 0 (scaffolding), not final —
// each generator phase will flesh out its own layer's fields.

/** Wraps a generated value with the upstream cause(s) it must trace back to (spec Section 3 traceability requirement, Section 6 traceability check). */
export type Traced<T> = {
  value: T;
  derivedFrom: string[];
};

// ---------------------------------------------------------------------------
// Culture Layer (spec Section 3)
// ---------------------------------------------------------------------------

export type Climate = "arid" | "temperate" | "arctic" | "tropical" | "volcanic";
export type ResourceScarcity = "abundant" | "moderate" | "scarce" | "famine-prone";
export type ThreatModel =
  | "isolated"
  | "rival-clans"
  | "predators"
  | "natural-disaster-prone"
  | "colonizer-pressure";
export type KinshipStructure = "patrilineal" | "matrilineal" | "clan-based" | "non-kin-collective";
export type SettlementPattern = "nomadic" | "semi-nomadic" | "fixed-agrarian" | "urban";
export type CosmologyStance = "animist" | "polytheist-ancestral" | "dualist" | "pantheist" | "other";
export type TechnologyLevel = "stone" | "bronze" | "iron" | "early-industrial";
export type GovernmentType =
  | "chieftain"
  | "council"
  | "theocracy"
  | "hereditary-monarchy"
  | "stateless-egalitarian";

export type CultureSeedParams = {
  climate: Climate;
  resourceScarcity: ResourceScarcity;
  threatModel: ThreatModel;
  kinshipStructure: KinshipStructure;
  settlementPattern: SettlementPattern;
  cosmologyStance: CosmologyStance;
  technologyLevel: TechnologyLevel;
  governmentType: GovernmentType;
};

/** Lightweight per-culture phoneme/syllable-shape preference for downstream name generation (spec Section 3). Intentionally simple — not a full phonology engine. */
export type NamingConvention = {
  preferredOnsets: string[];
  preferredNuclei: string[];
  preferredCodas: string[];
  syllableShapes: string[]; // e.g. "CV", "CVC"
  texture: "harsh" | "flowing" | "clipped" | "ornate";
};

/** A tension flagged as productive (not a bug) per spec Section 3/6 — e.g. isolationist + scarce resources implying unmet trade need. */
export type FlaggedTension = {
  description: string;
  involvedFields: string[];
};

export type CultureProfile = {
  id: string;
  seed: CultureSeedParams;
  coreValues: Traced<string[]>;
  taboos: Traced<string[]>;
  conflictResolutionNorms: Traced<string>;
  socialStructure: Traced<{ authority: string; inheritance: string }>;
  ritualPractices: Traced<{ comingOfAge: string; deathRites: string; seasonal: string[] }>;
  artSensibility: Traced<{ beautiful: string[]; ugly: string[]; sacredToDepict: string[] }>;
  economicStructure: Traced<"gift-economy" | "barter" | "tribute" | "trade-based">;
  genderRoleNorms: Traced<string>;
  originNarrative: Traced<string>; // proto-myth; seeds Layer 3
  namingConvention: Traced<NamingConvention>;
  flaggedTensions: FlaggedTension[];
};

// ---------------------------------------------------------------------------
// Pantheon Layer (spec Section 4)
// ---------------------------------------------------------------------------

/** Explicit flag when a god's personality was rolled as a mismatch against culture expectation, rather than silently generated (spec Section 4/6). */
export type PersonalityMismatch = {
  isMismatch: boolean;
  expectedPersonality?: string;
  explanationHook?: string; // becomes a hook for Layer 3 myth generation
};

export type God = {
  id: string;
  name: string;
  domains: Traced<string[]>; // consolidation allowed — one god, multiple domains
  personality: Traced<string[]>;
  personalityMismatch: PersonalityMismatch;
  cultureId: string;
};

// ---------------------------------------------------------------------------
// Myth Layer (spec Section 5)
// ---------------------------------------------------------------------------

export type MythEventType = "god-acts" | "consequence" | "human-response" | "moral-outcome";

export type MythEvent = {
  type: MythEventType;
  description: string;
  involvedGodIds: string[];
  derivedFrom: string[];
};

export type Myth = {
  id: string;
  title: string;
  events: MythEvent[];
  cultureId: string;
  generation: number; // 0 = founding myth
};

/** A drifted copy of a myth produced by the mutation engine (Phase 7) — not used yet in Phase 0, defined now so the pipeline type-checks end to end. */
export type MythVariant = {
  id: string;
  parentMythId: string;
  generation: number;
  events: MythEvent[];
  mutationOperations: string[];
  triggeringEventId?: string;
};
