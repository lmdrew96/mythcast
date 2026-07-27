// Myth-layer validation (spec Section 6, per-layer specifics per Section 5).

import type { God, Myth, MythEventType } from "../types";
import { checkTraced } from "./core";
import type { ValidationReport } from "./types";

const MYTH_TRACE_PREFIXES = ["seed.", "culture.", "god:"];
const EXPECTED_SEQUENCE: MythEventType[] = ["god-acts", "consequence", "human-response", "moral-outcome"];

export function validateMyths(pantheon: God[], myths: Myth[]): ValidationReport {
  const godIds = new Set(pantheon.map((g) => g.id));
  const bugs = myths.flatMap((myth) => {
    const issues = [];

    const sequence = myth.events.map((e) => e.type);
    if (JSON.stringify(sequence) !== JSON.stringify(EXPECTED_SEQUENCE)) {
      issues.push({
        severity: "bug" as const,
        layer: "myth" as const,
        path: `myth:${myth.id}.events`,
        message: `event sequence is [${sequence.join(", ")}], expected [${EXPECTED_SEQUENCE.join(", ")}]`,
      });
    }

    for (const [i, event] of myth.events.entries()) {
      for (const godId of event.involvedGodIds) {
        if (!godIds.has(godId)) {
          issues.push({
            severity: "bug" as const,
            layer: "myth" as const,
            path: `myth:${myth.id}.events[${i}]`,
            message: `references god id "${godId}" which isn't in the given pantheon — dangling reference`,
          });
        }
      }
      issues.push(...checkTraced(event.derivedFrom, `myth:${myth.id}.events[${i}]`, "myth", MYTH_TRACE_PREFIXES));
    }

    return issues;
  });

  // No flag concept exists at the myth layer yet — nothing here is ever classified as an intentional deviation.
  return { bugs, flagged: [] };
}
