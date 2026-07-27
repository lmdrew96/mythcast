// Culture-layer validation (spec Section 6, per-layer specifics per Section 3).

import type { CultureProfile } from "../types";
import { checkTraced, evaluateRule, type ContradictionRule } from "./core";
import type { ValidationReport } from "./types";

const SEED_ONLY = ["seed."];

/**
 * Deliberately NOT checking for "opposed" core values here (e.g. adaptability
 * + permanence, or hierarchy-and-order + consensus both ranking high). Real
 * generation runs surfaced both combinations, and both are believable —
 * "we endure by adapting," a monarchy with a consultative council. Values
 * are aspirational and cultures hold contradictory ones all the time; that's
 * productive tension (spec Section 2), exactly what the validator must NOT
 * flatten. The spec's own contradiction example (patrilineal AND matrilineal
 * at once) is structural — a kinship *system* can't coherently be two
 * mutually exclusive things simultaneously — not aspirational. So the
 * rules below only catch structural incompatibilities between derived
 * culture fields, never "these two values are in tension."
 */

/** A tribute economy needs someone positioned to collect tribute; a stateless-egalitarian government has no formal ruler by definition. economicStructure is generated independently of governmentType and can (rarely) land on tribute anyway — the culture layer has no flag for this, so it's always a bug if it occurs. */
const TRIBUTE_WITHOUT_AUTHORITY_RULE: ContradictionRule<CultureProfile> = {
  description: "economic structure is tribute-based, but the government type is stateless-egalitarian — there's no authority positioned to collect tribute",
  detect: (c) => c.economicStructure.value === "tribute" && c.seed.governmentType === "stateless-egalitarian",
  isFlagged: () => false,
};

/** A gift economy redistributes surplus; famine-prone scarcity means there is no surplus to redistribute. Structurally incompatible, and (like the rule above) economicStructure is derived independently of resourceScarcity, so it's always a bug if it occurs. */
const GIFT_ECONOMY_UNDER_FAMINE_RULE: ContradictionRule<CultureProfile> = {
  description: "economic structure is a gift economy, but the culture is famine-prone — there's no surplus to redistribute",
  detect: (c) => c.economicStructure.value === "gift-economy" && c.seed.resourceScarcity === "famine-prone",
  isFlagged: () => false,
};

export function validateCulture(culture: CultureProfile): ValidationReport {
  const evaluated = [
    ...evaluateRule(TRIBUTE_WITHOUT_AUTHORITY_RULE, culture, "culture", "culture.economicStructure"),
    ...evaluateRule(GIFT_ECONOMY_UNDER_FAMINE_RULE, culture, "culture", "culture.economicStructure"),
    ...checkTraced(culture.coreValues.derivedFrom, "culture.coreValues", "culture", SEED_ONLY),
    ...checkTraced(culture.taboos.derivedFrom, "culture.taboos", "culture", SEED_ONLY),
    ...checkTraced(culture.conflictResolutionNorms.derivedFrom, "culture.conflictResolutionNorms", "culture", SEED_ONLY),
    ...checkTraced(culture.socialStructure.derivedFrom, "culture.socialStructure", "culture", SEED_ONLY),
    ...checkTraced(culture.ritualPractices.derivedFrom, "culture.ritualPractices", "culture", SEED_ONLY),
    ...checkTraced(culture.artSensibility.derivedFrom, "culture.artSensibility", "culture", SEED_ONLY),
    ...checkTraced(culture.economicStructure.derivedFrom, "culture.economicStructure", "culture", SEED_ONLY),
    ...checkTraced(culture.genderRoleNorms.derivedFrom, "culture.genderRoleNorms", "culture", SEED_ONLY),
    ...checkTraced(culture.originNarrative.derivedFrom, "culture.originNarrative", "culture", SEED_ONLY),
    ...checkTraced(culture.namingConvention.derivedFrom, "culture.namingConvention", "culture", SEED_ONLY),
  ];

  // Emergent tension is an intentional feature (spec Section 3), never a bug — surface it as flagged, not as a problem.
  const tensionFlags = culture.flaggedTensions.map((t) => ({
    severity: "flagged" as const,
    layer: "culture" as const,
    path: `culture.flaggedTensions[${t.involvedFields.join(",")}]`,
    message: t.description,
  }));

  return {
    bugs: evaluated.filter((i) => i.severity === "bug"),
    flagged: [...evaluated.filter((i) => i.severity === "flagged"), ...tensionFlags],
  };
}
