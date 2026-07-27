"use client";

import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { ThemeName, ThemeVariantKind } from "@/lib/theming/palettes";
import { Button } from "./ui/Button";

export function CodexExport({ cultureId, themeName, themeVariant }: { cultureId: Id<"cultures">; themeName: ThemeName; themeVariant: ThemeVariantKind }) {
  const generate = useAction(api.codex.generate);
  const [pending, setPending] = useState<"styled" | "printer-friendly" | "reference" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [readyLink, setReadyLink] = useState<{ mode: "styled" | "printer-friendly" | "reference"; url: string } | null>(null);

  async function download(mode: "styled" | "printer-friendly" | "reference") {
    setPending(mode);
    setError(null);
    setReadyLink(null);
    // Open the tab synchronously, in the same task as the click, so Safari
    // (and other browsers that only treat same-task window.open as
    // user-initiated) doesn't silently block it once the PDF finishes
    // generating on the other side of an await.
    const newTab = window.open("", "_blank");
    try {
      const url = await generate({ cultureId, mode, themeName, themeVariant });
      if (newTab) {
        newTab.location.href = url;
      } else {
        // Popup was blocked outright (even the blank tab) — fall back to a
        // visible link the user can click themselves.
        setReadyLink({ mode, url });
      }
    } catch (err) {
      newTab?.close();
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
        <Button variant="ghost" onClick={() => download("reference")} disabled={pending !== null}>
          {pending === "reference" ? "Generating…" : "Download DM quick-reference PDF"}
        </Button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {readyLink && (
        <p className="text-xs">
          Your browser blocked the popup —{" "}
          <a href={readyLink.url} target="_blank" rel="noreferrer" className="underline">
            click here to download the {readyLink.mode} PDF
          </a>
          .
        </p>
      )}
    </div>
  );
}
