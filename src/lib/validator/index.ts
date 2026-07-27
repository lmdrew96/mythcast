// Consistency Validator entry point (spec Section 6). Validates all three
// generation layers with one shared referee (core.ts's classify/traceability
// mechanics) rather than three separate reimplementations.

import type { CultureProfile, God, Myth } from "../types";
import { validateCulture } from "./culture";
import { validatePantheon } from "./pantheon";
import { validateMyths } from "./myth";
import { mergeReports } from "./types";
import type { ValidationReport } from "./types";

export function validateAll(culture: CultureProfile, pantheon: God[], myths: Myth[]): ValidationReport {
  return mergeReports([validateCulture(culture), validatePantheon(culture, pantheon), validateMyths(pantheon, myths)]);
}

export type { ValidationIssue, ValidationReport, Layer } from "./types";
export { validateCulture, validatePantheon, validateMyths };
