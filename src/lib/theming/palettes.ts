// Visual Theming System (spec Section 8.1): 5 curated palettes, each with a
// light and dark variant (10 total), role-mapped to background/surface/
// primaryAccent/secondaryAccent/text.
//
// Role-mapping algorithm: rank a palette's 5 colors by luminance. The
// middle-luminance color becomes the primary accent and stays constant
// across both variants (spec: "reads as the same identity in light or dark
// mode"). The light variant pulls background/surface from the two lightest
// remaining colors and text from the darkest; the dark variant inverts
// that. This isn't an arbitrary choice — it reproduces the spec's own
// worked example exactly: sorted by luminance, Nightfall Indigo's middle
// color is Majorelle Blue (7546E8), the exact color spec Section 8.1 names
// as that theme's anchor accent.

export type ThemeRole = "background" | "surface" | "primaryAccent" | "secondaryAccent" | "text";
export type ThemeVariantKind = "light" | "dark";

export type ThemeName = "nightfall-indigo" | "glacial-current" | "autumn-hearth" | "ivory-ascension" | "moonlit-thicket";

export type ThemeColors = Record<ThemeRole, string>;

export type Theme = {
  name: ThemeName;
  label: string;
  light: ThemeColors;
  dark: ThemeColors;
};

export const THEME_NAMES: ThemeName[] = ["nightfall-indigo", "glacial-current", "autumn-hearth", "ivory-ascension", "moonlit-thicket"];

const PALETTE_SOURCE: Record<ThemeName, { label: string; colors: string[] }> = {
  "nightfall-indigo": { label: "Nightfall Indigo", colors: ["0D0E20", "2D1C7F", "7546E8", "C8B3F6", "B0A9E5"] },
  "glacial-current": { label: "Glacial Current", colors: ["99B9DF", "0E1B33", "117AE0", "0949A5", "5FAEF8"] },
  "autumn-hearth": { label: "Autumn Hearth", colors: ["E6D7C4", "9F9A60", "6E5335", "4D3920", "A05432"] },
  "ivory-ascension": { label: "Ivory Ascension", colors: ["F4F7EA", "E2D9E2", "CDB9DD", "75ADC9", "9580D4"] },
  "moonlit-thicket": { label: "Moonlit Thicket", colors: ["BDDEDD", "8BB9C1", "7F5388", "564A70", "34283F"] },
};

/** Relative luma of a `RRGGBB` hex string (no `#`), used only to rank a palette's 5 colors light-to-dark — not a color-science-grade luminance. */
function luma(hex: string): number {
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function buildTheme(name: ThemeName): Theme {
  const { label, colors } = PALETTE_SOURCE[name];
  const rankedLightToDark = [...colors].sort((a, b) => luma(b) - luma(a));
  const [lightest, secondLightest, primaryAccent, secondDarkest, darkest] = rankedLightToDark;

  return {
    name,
    label,
    light: { background: lightest, surface: secondLightest, primaryAccent, secondaryAccent: secondDarkest, text: darkest },
    dark: { background: darkest, surface: secondDarkest, primaryAccent, secondaryAccent: secondLightest, text: lightest },
  };
}

export const THEMES: Record<ThemeName, Theme> = Object.fromEntries(THEME_NAMES.map((name) => [name, buildTheme(name)])) as Record<ThemeName, Theme>;

/** All 10 theme variants, flattened for iteration (e.g. a theme picker). */
export const THEME_VARIANTS: { name: ThemeName; label: string; variant: ThemeVariantKind; colors: ThemeColors }[] = THEME_NAMES.flatMap((name) => {
  const theme = THEMES[name];
  return [
    { name, label: theme.label, variant: "light" as const, colors: theme.light },
    { name, label: theme.label, variant: "dark" as const, colors: theme.dark },
  ];
});

export function getThemeColors(name: ThemeName, variant: ThemeVariantKind): ThemeColors {
  return THEMES[name][variant];
}

/** CSS custom properties for a theme variant, prefixed so they can't collide with unrelated `--color-*` tokens (e.g. Tailwind's own theme vars). */
export function themeToCssVars(colors: ThemeColors): Record<string, string> {
  return {
    "--mc-background": `#${colors.background}`,
    "--mc-surface": `#${colors.surface}`,
    "--mc-primary": `#${colors.primaryAccent}`,
    "--mc-secondary": `#${colors.secondaryAccent}`,
    "--mc-text": `#${colors.text}`,
  };
}
