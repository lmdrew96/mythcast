import { runPipeline } from "@/lib/pipeline";
import { suggestTheme } from "@/lib/theming/autoSuggest";
import { ThemePicker } from "@/components/ThemePicker";
import type { CultureSeedParams } from "@/lib/types";

const demoSeed: CultureSeedParams = {
  climate: "arid",
  resourceScarcity: "scarce",
  threatModel: "isolated",
  kinshipStructure: "clan-based",
  settlementPattern: "semi-nomadic",
  cosmologyStance: "animist",
  technologyLevel: "bronze",
  governmentType: "council",
};

export default function Home() {
  const { culture, pantheon, myths } = runPipeline(demoSeed);
  const suggested = suggestTheme(demoSeed);

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-8 font-mono text-sm">
      <h1 className="text-xl font-bold">Mythcast — Culture, Pantheon &amp; Myth Generators (no drift yet)</h1>
      <ThemePicker suggested={suggested}>
        <div className="flex flex-col gap-6">
          <section>
            <h2 className="font-semibold" style={{ color: "var(--mc-primary)" }}>
              Culture
            </h2>
            <pre className="overflow-x-auto rounded p-3" style={{ backgroundColor: "var(--mc-surface)" }}>
              {JSON.stringify(culture, null, 2)}
            </pre>
          </section>
          <section>
            <h2 className="font-semibold" style={{ color: "var(--mc-primary)" }}>
              Pantheon
            </h2>
            <pre className="overflow-x-auto rounded p-3" style={{ backgroundColor: "var(--mc-surface)" }}>
              {JSON.stringify(pantheon, null, 2)}
            </pre>
          </section>
          <section>
            <h2 className="font-semibold" style={{ color: "var(--mc-primary)" }}>
              Myths
            </h2>
            <pre className="overflow-x-auto rounded p-3" style={{ backgroundColor: "var(--mc-surface)" }}>
              {JSON.stringify(myths, null, 2)}
            </pre>
          </section>
        </div>
      </ThemePicker>
    </main>
  );
}
