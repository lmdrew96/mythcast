"use node";

// Codex export (spec Section 8): renders a culture's persisted pantheon +
// myths to a PDF via CodexDocument and stores it in Convex file storage,
// returning a signed URL the client can download/open directly.

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { renderToBuffer } from "@react-pdf/renderer";
import { themeNameValidator } from "./validators";
import { CodexDocument } from "../src/lib/codex/CodexDocument";
import { cultureToProseSummary, godToProse, mythToProse } from "../src/lib/codex/prose";
import { getThemeColors } from "../src/lib/theming/palettes";
import { suggestTheme } from "../src/lib/theming/autoSuggest";
import type { ThemeName, ThemeVariantKind } from "../src/lib/theming/palettes";
import type { CultureProfile, God, Myth } from "../src/lib/types";
import type { Faction } from "../src/lib/culture/factions";
import type { Doc } from "./_generated/dataModel";

export const generate = action({
  args: {
    cultureId: v.id("cultures"),
    mode: v.union(v.literal("styled"), v.literal("printer-friendly"), v.literal("reference")),
    themeName: v.optional(themeNameValidator),
    themeVariant: v.optional(v.union(v.literal("light"), v.literal("dark"))),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const cultureDoc = await ctx.runQuery(api.cultures.get, { cultureId: args.cultureId });
    if (!cultureDoc) throw new Error("Culture not found");
    const culture = cultureDoc.data as CultureProfile;

    const godDocs: Doc<"gods">[] = await ctx.runQuery(api.gods.listByCulture, { cultureId: args.cultureId });
    const mythDocs: Doc<"myths">[] = await ctx.runQuery(api.myths.listByCulture, { cultureId: args.cultureId });
    const factionDocs: Doc<"factions">[] = await ctx.runQuery(api.factions.listByCulture, { cultureId: args.cultureId });

    const themeName: ThemeName = args.themeName ?? suggestTheme(culture.seed);
    const themeVariant: ThemeVariantKind = args.themeVariant ?? "light";
    const colors = getThemeColors(themeName, themeVariant);

    const buffer = await renderToBuffer(
      <CodexDocument
        mode={args.mode}
        colors={colors}
        data={{
          cultureName: cultureDoc.name,
          summary: cultureToProseSummary(culture),
          gods: godDocs.map((doc) => {
            const god = doc.data as God;
            return { name: god.name, prose: godToProse(god), domains: god.domains.value, personality: god.personality.value };
          }),
          myths: mythDocs.map((doc) => mythToProse(doc.data as Myth)),
          factions: factionDocs.map((doc) => {
            const faction = doc.data as Faction;
            return { name: faction.name, goal: faction.goal, allegiance: faction.allegiance };
          }),
          tensions: culture.flaggedTensions.map((t) => t.description),
        }}
      />,
    );

    const storageId = await ctx.storage.store(new Blob([new Uint8Array(buffer)], { type: "application/pdf" }));
    const url = await ctx.storage.getUrl(storageId);
    if (!url) throw new Error("Failed to resolve a URL for the generated codex PDF");
    return url;
  },
});
