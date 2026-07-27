// Naming conventions — a lightweight per-culture phoneme/syllable-shape
// preference (spec Section 3). Deliberately simple: once a texture is
// chosen (see NAMING_TEXTURE_CANDIDATES in pools.ts), its phoneme palette is
// a fixed lookup, not a full phonology engine like ConLangLab.

import type { NamingConvention } from "../types";

const TEXTURE_PALETTE: Record<NamingConvention["texture"], Omit<NamingConvention, "texture">> = {
  harsh: {
    preferredOnsets: ["k", "g", "kr", "dr", "z"],
    preferredNuclei: ["a", "o", "u"],
    preferredCodas: ["k", "g", "r", "th"],
    syllableShapes: ["CVC", "CCVC"],
  },
  flowing: {
    preferredOnsets: ["l", "m", "n", "w", "y"],
    preferredNuclei: ["a", "e", "i", "o", "u", "ae"],
    preferredCodas: ["", "n", "l", "m"],
    syllableShapes: ["CV", "CVV"],
  },
  clipped: {
    preferredOnsets: ["t", "k", "s", "p"],
    preferredNuclei: ["i", "u", "a"],
    preferredCodas: ["t", "k", "s", "p"],
    syllableShapes: ["CVC"],
  },
  ornate: {
    preferredOnsets: ["sh", "th", "vr", "zh", "kh"],
    preferredNuclei: ["ai", "eo", "ia", "o"],
    preferredCodas: ["n", "th", "l", "r"],
    syllableShapes: ["CVC", "CVCV", "CVVC"],
  },
};

export function buildNamingConvention(texture: NamingConvention["texture"]): NamingConvention {
  return { texture, ...TEXTURE_PALETTE[texture] };
}
