// seed → culture → pantheon → myths pipeline. Culture (Phase 2), Pantheon
// (Phase 3), and Myth (Phase 4) generation are all real; mutation/drift is
// still Phase 7's job — every myth here is generation 0.

import { generateCulture } from "./culture/generate";
import { generatePantheon } from "./pantheon/generate";
import { generateMyths } from "./myth/generate";
import type { CultureSeedParams } from "./types";

export { generateCulture, generatePantheon, generateMyths };

export function runPipeline(seed: CultureSeedParams) {
  const culture = generateCulture(seed);
  const pantheon = generatePantheon(culture);
  const myths = generateMyths(culture, pantheon);
  return { culture, pantheon, myths };
}
