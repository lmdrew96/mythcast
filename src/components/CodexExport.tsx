"use client";

import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { ThemeName, ThemeVariantKind } from "@/lib/theming/palettes";
import { Button } from "./ui/Button";

export function CodexExport({ cultureId, themeName, themeVariant }: { cultureId: Id<"cultures">; themeName: ThemeName; themeVariant: ThemeVariantKind }) {
  const generate = useAction(api.codex.generate);
  const [pending, setPending] = useState<"styled" | "printer-friendly" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function download(mode: "styled" | "printer-friendly") {
    setPending(mode);
    setError(null);
    try {
      const url = await generate({ cultureId, mode, themeName, themeVariant });
      window.open(url, "_blank");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate codex PDF");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" onClick={() => download("styled")} disabled={pending !== null}>
          {pending === "styled" ? "Generating…" : "Download styled PDF"}
        </Button>
        <Button variant="ghost" onClick={() => download("printer-friendly")} disabled={pending !== null}>
          {pending === "printer-friendly" ? "Generating…" : "Download printer-friendly PDF"}
        </Button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
