import { describe, expect, it } from "vitest";
import { THEME_NAMES, THEME_VARIANTS, THEMES, getThemeColors, themeToCssVars } from "@/lib/theming/palettes";
import { suggestTheme } from "@/lib/theming/autoSuggest";
import type { CultureSeedParams } from "@/lib/types";

describe("THEMES", () => {
  it("defines exactly 5 themes and 10 total variants", () => {
    expect(THEME_NAMES.length).toBe(5);
    expect(THEME_VARIANTS.length).toBe(10);
  });

  it("keeps the primary accent constant across light and dark for every theme", () => {
    for (const name of THEME_NAMES) {
      const theme = THEMES[name];
      expect(theme.light.primaryAccent).toBe(theme.dark.primaryAccent);
    }
  });

  it("reproduces the spec's worked example: Nightfall Indigo's accent is Majorelle Blue", () => {
    expect(THEMES["nightfall-indigo"].light.primaryAccent).toBe("7546E8");
  });

  it("uses all 5 palette source colors exactly once per variant", () => {
    for (const name of THEME_NAMES) {
      const theme = THEMES[name];
      for (const variant of [theme.light, theme.dark] as const) {
        const values = Object.values(variant);
        expect(new Set(values).size).toBe(5);
      }
    }
  });

  it("gives the light variant a lighter background than its dark variant", () => {
    const luma = (hex: string) => {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return 0.299 * r + 0.587 * g + 0.114 * b;
    };
    for (const name of THEME_NAMES) {
      const theme = THEMES[name];
      expect(luma(theme.light.background)).toBeGreaterThan(luma(theme.dark.background));
      expect(luma(theme.light.text)).toBeLessThan(luma(theme.dark.text));
    }
  });

  it("getThemeColors returns the same colors as the THEMES table", () => {
    expect(getThemeColors("glacial-current", "dark")).toEqual(THEMES["glacial-current"].dark);
  });

  it("themeToCssVars produces hex values prefixed with #", () => {
    const vars = themeToCssVars(THEMES["autumn-hearth"].light);
    expect(vars["--mc-background"]).toMatch(/^#[0-9A-F]{6}$/);
    expect(Object.keys(vars)).toEqual(["--mc-background", "--mc-surface", "--mc-primary", "--mc-secondary", "--mc-text"]);
  });
});

const baseSeed: CultureSeedParams = {
  climate: "temperate",
  resourceScarcity: "scarce",
  threatModel: "rival-clans",
  kinshipStructure: "patrilineal",
  settlementPattern: "semi-nomadic",
  cosmologyStance: "polytheist-ancestral",
  technologyLevel: "iron",
  governmentType: "council",
};

function seedWith(overrides: Partial<CultureSeedParams>): CultureSeedParams {
  return { ...baseSeed, ...overrides };
}

describe("suggestTheme", () => {
  it("suggests Nightfall Indigo for dualist urban cultures", () => {
    expect(suggestTheme(seedWith({ cosmologyStance: "dualist", settlementPattern: "urban" }))).toBe("nightfall-indigo");
  });

  it("suggests Glacial Current for arctic cultures", () => {
    expect(suggestTheme(seedWith({ climate: "arctic", threatModel: "isolated" }))).toBe("glacial-current");
  });

  it("suggests Autumn Hearth for agrarian animist cultures", () => {
    expect(suggestTheme(seedWith({ settlementPattern: "fixed-agrarian", cosmologyStance: "animist" }))).toBe("autumn-hearth");
  });

  it("suggests Ivory Ascension for pantheist, abundant, low-threat cultures", () => {
    expect(suggestTheme(seedWith({ cosmologyStance: "pantheist", resourceScarcity: "abundant", threatModel: "isolated" }))).toBe("ivory-ascension");
  });

  it("suggests Moonlit Thicket for clan-based moderate-scarcity animist cultures", () => {
    expect(suggestTheme(seedWith({ cosmologyStance: "animist", kinshipStructure: "clan-based", resourceScarcity: "moderate", settlementPattern: "nomadic" }))).toBe(
      "moonlit-thicket",
    );
  });

  it("always returns one of the 5 declared theme names", () => {
    expect(THEME_NAMES).toContain(suggestTheme(baseSeed));
  });
});
