import { runPipeline } from "@/lib/pipeline";
import { suggestTheme } from "@/lib/theming/autoSuggest";
import { mythToProse } from "@/lib/codex/prose";
import { ThemePicker } from "@/components/ThemePicker";
import { CultureMasthead } from "@/components/CultureMasthead";
import { GodCard } from "@/components/GodCard";
import { MythCard } from "@/components/MythCard";
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
  const cultureName = `${demoSeed.cosmologyStance} ${demoSeed.climate} culture`;

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 p-8">
      <div>
        <p className="font-mono text-xs tracking-wide uppercase opacity-60">Mythcast — generator preview, no drift yet</p>
      </div>
      <ThemePicker suggested={suggested}>
        <div className="flex flex-col gap-8">
          <CultureMasthead name={cultureName} culture={culture} />

          <section className="flex flex-col gap-3">
            <h2 className="font-display text-2xl" style={{ color: "var(--mc-primary)" }}>
              Pantheon
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {pantheon.map((god) => (
                <GodCard key={god.id} god={god} />
              ))}
            </div>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="font-display text-2xl" style={{ color: "var(--mc-primary)" }}>
              Myths
            </h2>
            <div className="flex flex-col gap-4">
              {myths.map((myth) => {
                const prose = mythToProse(myth);
                return <MythCard key={myth.id} title={prose.title} generation={prose.generation} paragraph={prose.paragraph} />;
              })}
            </div>
          </section>
        </div>
      </ThemePicker>
    </main>
  );
}
