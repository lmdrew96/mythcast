"use client";

import { useMemo, useState } from "react";
import { THEME_VARIANTS, getThemeColors, themeToCssVars, type ThemeName, type ThemeVariantKind } from "@/lib/theming/palettes";

export function ThemePicker({ suggested, children }: { suggested: ThemeName; children: React.ReactNode }) {
  const [name, setName] = useState<ThemeName>(suggested);
  const [variant, setVariant] = useState<ThemeVariantKind>("light");

  const cssVars = useMemo(() => themeToCssVars(getThemeColors(name, variant)), [name, variant]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {Array.from(new Map(THEME_VARIANTS.map((v) => [v.name, v.label])).entries()).map(([themeName, label]) => (
          <button
            key={themeName}
            type="button"
            onClick={() => setName(themeName)}
            className={`rounded border px-3 py-1 text-xs font-medium ${
              name === themeName ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black" : "border-black/20 dark:border-white/20"
            }`}
          >
            {label}
            {themeName === suggested ? " (suggested)" : ""}
          </button>
        ))}
        <div className="ml-2 flex gap-1 border-l border-black/20 pl-2 dark:border-white/20">
          {(["light", "dark"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setVariant(v)}
              className={`rounded border px-3 py-1 text-xs font-medium capitalize ${
                variant === v ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black" : "border-black/20 dark:border-white/20"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>
      <div
        style={{
          ...cssVars,
          backgroundColor: "var(--mc-background)",
          color: "var(--mc-text)",
          borderColor: "var(--mc-secondary)",
        } as React.CSSProperties}
        className="rounded-lg border-2 p-4"
      >
        {children}
      </div>
    </div>
  );
}
