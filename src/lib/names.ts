// Turns a culture's naming convention (src/lib/culture/naming.ts) into an
// actual name string. Spec Section 3 calls this "intentionally simple — not
// a full phonology engine like ConLangLab", so this is a direct syllable-
// shape walk, not a real generative phonology model: consonant runs before
// any remaining vowel are an onset pick, a trailing consonant run with no
// vowel after it is a coda pick, and every vowel run is one nucleus pick
// (our nuclei pools already include diphthong strings like "ai" for
// textures that want them, so a run of V's is still a single pick).

import type { NamingConvention } from "./types";
import type { Rng } from "./rng";

function buildSegment(nc: NamingConvention, rng: Rng): string {
  const shape = rng.pick(nc.syllableShapes);
  const runs = shape.match(/C+|V+/g) ?? [];
  let result = "";
  for (let i = 0; i < runs.length; i++) {
    const run = runs[i];
    if (run.startsWith("V")) {
      result += rng.pick(nc.preferredNuclei);
    } else {
      const hasVowelAfter = runs.slice(i + 1).some((r) => r.startsWith("V"));
      const pool = hasVowelAfter ? nc.preferredOnsets : nc.preferredCodas;
      result += rng.pick(pool);
    }
  }
  return result;
}

function capitalize(word: string): string {
  return word.length > 0 ? word[0].toUpperCase() + word.slice(1) : word;
}

export function generateName(nc: NamingConvention, rng: Rng): string {
  const segments = rng.int(1, 2);
  let word = "";
  for (let i = 0; i < segments; i++) word += buildSegment(nc, rng);
  return capitalize(word);
}

/** Generates a name not already in `taken`, retrying a bounded number of times before falling back to a numbered variant. */
export function generateUniqueName(nc: NamingConvention, rng: Rng, taken: Set<string>): string {
  for (let attempt = 0; attempt < 10; attempt++) {
    const name = generateName(nc, rng);
    if (!taken.has(name)) return name;
  }
  let fallback = generateName(nc, rng);
  let suffix = 2;
  while (taken.has(fallback)) {
    fallback = `${generateName(nc, rng)}-${suffix++}`;
  }
  return fallback;
}
