import { runPipeline } from "@/lib/pipeline";
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
  const { culture, pantheon, myth } = runPipeline(demoSeed);

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-8 font-mono text-sm">
      <h1 className="text-xl font-bold">Mythcast — Culture Generator (pantheon/myth still stubs)</h1>
      <section>
        <h2 className="font-semibold">Culture</h2>
        <pre className="overflow-x-auto rounded bg-black/5 p-3">
          {JSON.stringify(culture, null, 2)}
        </pre>
      </section>
      <section>
        <h2 className="font-semibold">Pantheon</h2>
        <pre className="overflow-x-auto rounded bg-black/5 p-3">
          {JSON.stringify(pantheon, null, 2)}
        </pre>
      </section>
      <section>
        <h2 className="font-semibold">Myth</h2>
        <pre className="overflow-x-auto rounded bg-black/5 p-3">
          {JSON.stringify(myth, null, 2)}
        </pre>
      </section>
    </main>
  );
}
