// Codex export (spec Section 8): renders a culture's pantheon + myths as an
// in-world anthropological/mythological document. "styled" applies the
// active theme's colors (Phase 9); "printer-friendly" strips to
// black-on-white, minimal ink, for TTRPG table use. "reference" (2026-07-27
// DM-worldbuilding gap report, high-value add #8) is a different layout
// entirely — a scannable one-page DM cheat-sheet (pantheon table,
// faction/relationship summary, active tensions) instead of read-aloud
// prose, reusing this same @react-pdf/renderer pipeline.
//
// PDF generation approach (spec Section 10, open question #4): @react-pdf/
// renderer over a headless-browser HTML->PDF pipeline — pure JS, no browser
// binary to ship/cold-start in a serverless action. A reasonable starting
// choice per spec's framing; Polish/Tuning can revisit if it doesn't hold up.

import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { ThemeColors } from "../theming/palettes";

export type CodexGod = { name: string; prose: string; domains: string[]; personality: string[] };
export type CodexMyth = { title: string; generation: number; paragraph: string; hook?: string };
export type CodexFaction = { name: string; goal: string; allegiance: string };

export type CodexData = {
  cultureName: string;
  summary: string;
  gods: CodexGod[];
  myths: CodexMyth[];
  factions: CodexFaction[];
  tensions: string[];
};

export type CodexMode = "styled" | "printer-friendly" | "reference";

function buildStyles(mode: CodexMode, colors: ThemeColors) {
  const styled = mode !== "printer-friendly";
  const hex = (h: string) => `#${h}`;

  return StyleSheet.create({
    page: {
      padding: 48,
      backgroundColor: styled ? hex(colors.background) : "#FFFFFF",
      color: styled ? hex(colors.text) : "#000000",
      fontSize: 11,
      lineHeight: 1.5,
    },
    title: {
      fontSize: 26,
      lineHeight: 1.3,
      marginBottom: 18,
      fontWeight: "bold",
      color: styled ? hex(colors.primaryAccent) : "#000000",
    },
    summary: {
      marginBottom: 20,
      fontStyle: "italic",
    },
    sectionHeading: {
      fontSize: 16,
      fontWeight: "bold",
      marginTop: 20,
      marginBottom: 10,
      paddingBottom: 4,
      color: styled ? hex(colors.primaryAccent) : "#000000",
      borderBottomWidth: styled ? 2 : 1,
      borderBottomColor: styled ? hex(colors.secondaryAccent) : "#000000",
      borderBottomStyle: "solid",
    },
    entry: {
      marginBottom: 12,
      padding: styled ? 10 : 0,
      borderRadius: styled ? 4 : 0,
      backgroundColor: styled ? hex(colors.surface) : "transparent",
    },
    entryTitle: {
      fontSize: 12,
      fontWeight: "bold",
      marginBottom: 4,
      color: styled ? hex(colors.primaryAccent) : "#000000",
    },
    paragraph: {
      fontSize: 11,
    },
    hook: {
      fontSize: 10,
      fontStyle: "italic",
      marginTop: 6,
      paddingLeft: 8,
      borderLeftWidth: 2,
      borderLeftStyle: "solid",
      borderLeftColor: styled ? hex(colors.secondaryAccent) : "#000000",
    },
    hookLabel: {
      fontStyle: "normal",
      fontWeight: "bold",
    },
    refRow: {
      flexDirection: "row",
      marginBottom: 6,
      paddingBottom: 6,
      borderBottomWidth: 0.5,
      borderBottomStyle: "solid",
      borderBottomColor: styled ? hex(colors.secondaryAccent) : "#999999",
    },
    refCellName: {
      width: "25%",
      fontSize: 10,
      fontWeight: "bold",
      color: styled ? hex(colors.primaryAccent) : "#000000",
    },
    refCell: {
      width: "37.5%",
      fontSize: 10,
    },
  });
}

function ReferenceSheet({ data, styles }: { data: CodexData; styles: ReturnType<typeof buildStyles> }) {
  return (
    <Document title={`${data.cultureName} — DM Quick Reference`}>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{data.cultureName} — Quick Reference</Text>

        <Text style={styles.sectionHeading}>Pantheon</Text>
        {data.gods.map((god, index) => (
          <View key={index} style={styles.refRow}>
            <Text style={styles.refCellName}>{god.name}</Text>
            <Text style={styles.refCell}>{god.domains.join(", ")}</Text>
            <Text style={styles.refCell}>{god.personality.join(", ")}</Text>
          </View>
        ))}

        <Text style={styles.sectionHeading}>Factions</Text>
        {data.factions.length === 0 ? (
          <Text style={styles.paragraph}>No factions recorded.</Text>
        ) : (
          data.factions.map((faction, index) => (
            <View key={index} style={styles.refRow}>
              <Text style={styles.refCellName}>{faction.name}</Text>
              <Text style={styles.refCell}>{faction.allegiance}</Text>
              <Text style={styles.refCell}>{faction.goal}</Text>
            </View>
          ))
        )}

        <Text style={styles.sectionHeading}>Active Tensions</Text>
        {data.tensions.length === 0 ? (
          <Text style={styles.paragraph}>No flagged tensions.</Text>
        ) : (
          data.tensions.map((tension, index) => (
            <Text key={index} style={styles.paragraph}>
              • {tension}
            </Text>
          ))
        )}
      </Page>
    </Document>
  );
}

export function CodexDocument({ data, mode, colors }: { data: CodexData; mode: CodexMode; colors: ThemeColors }) {
  const styles = buildStyles(mode, colors);

  if (mode === "reference") {
    return <ReferenceSheet data={data} styles={styles} />;
  }

  return (
    <Document title={data.cultureName}>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{data.cultureName}</Text>
        <Text style={styles.summary}>{data.summary}</Text>

        <Text style={styles.sectionHeading}>The Pantheon</Text>
        {data.gods.map((god, index) => (
          <View key={index} style={styles.entry}>
            <Text style={styles.entryTitle}>{god.name}</Text>
            <Text style={styles.paragraph}>{god.prose}</Text>
          </View>
        ))}

        <Text style={styles.sectionHeading}>Myths</Text>
        {data.myths.map((myth, index) => (
          <View key={index} style={styles.entry}>
            <Text style={styles.entryTitle}>{myth.title}{myth.generation > 0 ? ` — generation ${myth.generation}` : ""}</Text>
            <Text style={styles.paragraph}>{myth.paragraph}</Text>
            {myth.hook && (
              <Text style={styles.hook}>
                <Text style={styles.hookLabel}>Adventure hook — </Text>
                {myth.hook}
              </Text>
            )}
          </View>
        ))}
      </Page>
    </Document>
  );
}
