"use client";

import { useEffect, useMemo, useState } from "react";
import { THEME_VARIANTS, getThemeColors, themeToCssVars, type ThemeName, type ThemeVariantKind } from "@/lib/theming/palettes";

type ThemedChildren = React.ReactNode | ((name: ThemeName, variant: ThemeVariantKind) => React.ReactNode);

export function ThemePicker({ suggested, children }: { suggested: ThemeName; children: ThemedChildren }) {
  const [name, setName] = useState<ThemeName>(suggested);
  const [variant, setVariant] = useState<ThemeVariantKind>("light");

  const cssVars = useMemo(() => themeToCssVars(getThemeColors(name, variant)), [name, variant]);

  // Page-wide light/dark split: the shell (globals.css) follows the same
  // toggle as the themed panel via this attribute, rather than a separate
  // shell-only mode.
  useEffect(() => {
    document.documentElement.setAttribute("data-mc-mode", variant);
  }, [variant]);

  const pillBase = "rounded-full border px-3 py-1 font-mono text-[0.6875rem] tracking-wide uppercase transition-colors duration-150";
  const pillActive = "border-foreground bg-foreground text-background";
  const pillInactive = "border-foreground/25 text-foreground/70 hover:border-foreground/50";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {Array.from(new Map(THEME_VARIANTS.map((v) => [v.name, v.label])).entries()).map(([themeName, label]) => (
          <button key={themeName} type="button" onClick={() => setName(themeName)} className={`${pillBase} ${name === themeName ? pillActive : pillInactive}`}>
            {label}
            {themeName === suggested ? " · suggested" : ""}
          </button>
        ))}
        <div className="ml-1 flex gap-1 border-l border-foreground/20 pl-3">
          {(["light", "dark"] as const).map((v) => (
            <button key={v} type="button" onClick={() => setVariant(v)} className={`${pillBase} ${variant === v ? pillActive : pillInactive}`}>
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
        className="mc-panel rounded-lg border-2 p-6"
      >
        {typeof children === "function" ? children(name, variant) : children}
      </div>
    </div>
  );
}
