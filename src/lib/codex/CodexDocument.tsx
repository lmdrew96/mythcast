// Codex export (spec Section 8): renders a culture's pantheon + myths as an
// in-world anthropological/mythological document. Two modes share this one
// component — "styled" applies the active theme's colors (Phase 9); "printer-
// friendly" strips to black-on-white, minimal ink, for TTRPG table use.
//
// PDF generation approach (spec Section 10, open question #4): @react-pdf/
// renderer over a headless-browser HTML->PDF pipeline — pure JS, no browser
// binary to ship/cold-start in a serverless action. A reasonable starting
// choice per spec's framing; Polish/Tuning can revisit if it doesn't hold up.

import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { ThemeColors } from "../theming/palettes";

export type CodexGod = { name: string; prose: string };
export type CodexMyth = { title: string; generation: number; paragraph: string };

export type CodexData = {
  cultureName: string;
  summary: string;
  gods: CodexGod[];
  myths: CodexMyth[];
};

export type CodexMode = "styled" | "printer-friendly";

function buildStyles(mode: CodexMode, colors: ThemeColors) {
  const styled = mode === "styled";
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
  });
}

export function CodexDocument({ data, mode, colors }: { data: CodexData; mode: CodexMode; colors: ThemeColors }) {
  const styles = buildStyles(mode, colors);

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
          </View>
        ))}
      </Page>
    </Document>
  );
}
