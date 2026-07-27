// Shared types for the Consistency Validator (spec Section 6). One rulebook
// of *mechanics*, not one rulebook of *rules* — every layer feeds its own
// contradiction rules through the same evaluate/classify machinery here.

export type Layer = "culture" | "pantheon" | "myth";

export type ValidationIssue = {
  /** "bug" = unflagged inconsistency (a real problem). "flagged" = an intentional deviation the generator already marked as a feature (spec Section 2/6) — reported for visibility, not as a problem. */
  severity: "bug" | "flagged";
  layer: Layer;
  /** Which record/field this concerns, e.g. "culture.coreValues" or "god:abc123.personality". */
  path: string;
  message: string;
};

export type ValidationReport = {
  /** Unflagged inconsistencies and orphan fields — real problems. Empty means clean. */
  bugs: ValidationIssue[];
  /** Flagged intentional deviations (pantheon mismatches, emergent culture tension) — informational, not problems. */
  flagged: ValidationIssue[];
};

export function emptyReport(): ValidationReport {
  return { bugs: [], flagged: [] };
}

export function mergeReports(reports: ValidationReport[]): ValidationReport {
  return {
    bugs: reports.flatMap((r) => r.bugs),
    flagged: reports.flatMap((r) => r.flagged),
  };
}
