// Shared validator mechanics (spec Section 6): the traceability walk and the
// flagged-vs-bug classifier. Every layer's validator (culture.ts,
// pantheon.ts, myth.ts) calls into these instead of reimplementing them —
// per-layer files only supply *what* to check, not *how* to classify it.

import type { Layer, ValidationIssue } from "./types";

/** Confirms a `derivedFrom` array is non-empty and every entry matches one of the layer's allowed provenance prefixes (spec: no field may be an untraceable orphan). */
export function checkTraced(derivedFrom: string[], path: string, layer: Layer, allowedPrefixes: string[]): ValidationIssue[] {
  if (derivedFrom.length === 0) {
    return [{ severity: "bug", layer, path, message: "field has no derivedFrom — untraceable orphan" }];
  }
  const bad = derivedFrom.filter((cause) => !allowedPrefixes.some((prefix) => cause.startsWith(prefix)));
  if (bad.length > 0) {
    return [{ severity: "bug", layer, path, message: `derivedFrom cites unrecognized provenance: ${bad.join(", ")}` }];
  }
  return [];
}

export type ContradictionRule<T> = {
  description: string;
  /** True when the raw contradiction condition holds, regardless of whether it's explained. */
  detect: (subject: T) => boolean;
  /** True when the subject already carries an in-world explanation for the contradiction (a flag) — makes it a feature, not a bug. */
  isFlagged: (subject: T) => boolean;
};

/** Runs one rule against one subject; classifies the result as a bug (unflagged) or a feature (flagged) per the spec's core rule. Returns [] if the rule doesn't apply at all. */
export function evaluateRule<T>(rule: ContradictionRule<T>, subject: T, layer: Layer, path: string): ValidationIssue[] {
  if (!rule.detect(subject)) return [];
  return [{ severity: rule.isFlagged(subject) ? "flagged" : "bug", layer, path, message: rule.description }];
}
