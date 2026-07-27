// seed → culture → pantheon → myth pipeline. Culture generation is real
// (Phase 2, src/lib/culture/); pantheon and myth are still stubs pending
// Phases 3-4.

import { generateCulture } from "./culture/generate";
import type { CultureSeedParams, God, Myth } from "./types";
import type { CultureProfile } from "./types";

export { generateCulture };

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

export function runPipeline(seed: CultureSeedParams) {
  const culture = generateCulture(seed);
  const pantheon = generatePantheon(culture);
  const myth = generateMyth(culture, pantheon);
  return { culture, pantheon, myth };
}
