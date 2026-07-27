// Stub seed → culture → pantheon → myth pipeline (Phase 0 acceptance:
// "types compile, empty pipeline runs seed→culture→(stub)pantheon→(stub)myth
// end to end"). Real generation logic lands in Phases 2-4; this only proves
// the types connect across layers.

import type { CultureProfile, CultureSeedParams, God, Myth } from "./types";

export function generateCulture(seed: CultureSeedParams): CultureProfile {
  return {
    id: "stub-culture-1",
    seed,
    coreValues: { value: ["stub-value"], derivedFrom: ["seed.cosmologyStance"] },
    taboos: { value: [], derivedFrom: ["seed.threatModel"] },
    conflictResolutionNorms: { value: "stub-norm", derivedFrom: ["seed.governmentType"] },
    socialStructure: {
      value: { authority: "stub-authority", inheritance: "stub-inheritance" },
      derivedFrom: ["seed.kinshipStructure"],
    },
    ritualPractices: {
      value: { comingOfAge: "stub", deathRites: "stub", seasonal: [] },
      derivedFrom: ["seed.cosmologyStance", "seed.settlementPattern"],
    },
    artSensibility: {
      value: { beautiful: [], ugly: [], sacredToDepict: [] },
      derivedFrom: ["seed.cosmologyStance"],
    },
    economicStructure: { value: "barter", derivedFrom: ["seed.resourceScarcity", "seed.settlementPattern"] },
    genderRoleNorms: { value: "stub-role-norm", derivedFrom: ["seed.kinshipStructure"] },
    originNarrative: { value: "stub-origin-narrative", derivedFrom: ["seed.cosmologyStance"] },
    namingConvention: {
      value: {
        preferredOnsets: ["k", "t"],
        preferredNuclei: ["a", "o"],
        preferredCodas: ["n"],
        syllableShapes: ["CV", "CVC"],
        texture: "flowing",
      },
      derivedFrom: ["seed.climate"],
    },
    flaggedTensions: [],
  };
}

export function generatePantheon(culture: CultureProfile): God[] {
  return [
    {
      id: "stub-god-1",
      name: "Stub Deity",
      domains: { value: ["stub-domain"], derivedFrom: ["culture.coreValues"] },
      personality: { value: ["stub-trait"], derivedFrom: ["culture.coreValues"] },
      personalityMismatch: { isMismatch: false },
      cultureId: culture.id,
    },
  ];
}

export function generateMyth(culture: CultureProfile, pantheon: God[]): Myth {
  return {
    id: "stub-myth-1",
    title: "Stub Founding Myth",
    events: [
      {
        type: "god-acts",
        description: "stub event",
        involvedGodIds: pantheon.map((g) => g.id),
        derivedFrom: ["culture.originNarrative"],
      },
    ],
    cultureId: culture.id,
    generation: 0,
  };
}

export function runStubPipeline(seed: CultureSeedParams) {
  const culture = generateCulture(seed);
  const pantheon = generatePantheon(culture);
  const myth = generateMyth(culture, pantheon);
  return { culture, pantheon, myth };
}
