// seed → culture → pantheon → myth pipeline. Culture (Phase 2) and Pantheon
// (Phase 3) generation are real; myth is still a stub pending Phase 4.

import { generateCulture } from "./culture/generate";
import { generatePantheon } from "./pantheon/generate";
import type { CultureProfile, CultureSeedParams, God, Myth } from "./types";

export { generateCulture, generatePantheon };

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
