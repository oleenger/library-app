// Birds-eye lineage map — a chronological overview of every movement, grouped
// into its home period, so the whole taxonomy is navigable at a glance rather
// than only hop-by-hop. Each movement links to its centred lineage view.
//
// Server component: pure presentation over pre-counted bands from the route.

import Link from "next/link";
import type { Period } from "@/lib/taxonomy";
import { periodColor, shortPeriod } from "@/lib/display";
import { AppHeader } from "@/components/app-header";
import { PullToRefresh } from "@/components/pull-to-refresh";
import { MovementChip } from "@/components/lineage-view";
import type { LineageChip } from "@/components/lineage-view";
import { LineageGraph } from "@/components/lineage-graph";
import type { LineageGraph as LineageGraphData } from "@/lib/lineage-graph";

/** One band: a period (or the cross-period bucket) and the movements in it. */
export interface LineageBand {
  period: Period | null;
  chips: LineageChip[];
}

export function LineageMap({
  bands,
  total,
  owned,
  graph,
}: {
  bands: LineageBand[];
  /** Total movements in the taxonomy. */
  total: number;
  /** How many movements the user owns at least one work in. */
  owned: number;
  /** Positioned lineage graph for the timeline diagram. */
  graph: LineageGraphData;
}) {
  return (
    <PullToRefresh>
      <div className="min-h-screen">
        <AppHeader mode="back" />

        <main className="enter-up mx-auto max-w-3xl px-4 pb-28 pt-6 sm:px-6 lg:px-8">
          <header className="mb-8 px-1">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-ink-faint">
              Movement lineage
            </p>
            <h1 className="mt-1 font-serif text-4xl leading-tight tracking-[-0.02em] text-ink">
              The map
            </h1>
            <p className="mt-2 text-sm text-ink-soft">
              Every movement, oldest to newest. Tap one to trace what it grew out
              of, led to, and stood beside.{" "}
              <span className="text-ink">{owned}</span> of {total} present in your
              library.
            </p>
          </header>

          {/* Timeline graph: the connected led-to flow across periods. */}
          <section className="mb-10">
            <LineageGraph graph={graph} />
            <p className="mt-3 px-1 text-xs text-ink-faint">
              Arrows trace what each movement led to; dashed loops link movements
              within one period. Faded, dashed nodes aren&apos;t in your library yet.
            </p>
          </section>

          <div className="mb-4 px-1">
            <h2 className="font-serif text-2xl leading-tight tracking-[-0.01em] text-ink">
              Full index
            </h2>
            <p className="mt-1 text-sm text-ink-soft">
              Every movement, grouped by period.
            </p>
          </div>

          <div className="space-y-8">
            {bands.map((band) => {
              const color = periodColor(band.period);
              const label = band.period ? shortPeriod(band.period) : "Cross-period forms";
              return (
                <section key={band.period ?? "cross-period"} className="relative pl-5">
                  {/* Period rail */}
                  <span
                    className="absolute left-0 top-1 h-[calc(100%-0.5rem)] w-1 rounded-full"
                    style={{ backgroundColor: color }}
                    aria-hidden
                  />
                  <h2 className="flex items-baseline gap-2">
                    <span
                      className="font-serif text-lg tracking-[-0.01em]"
                      style={{ color }}
                    >
                      {label}
                    </span>
                    <span className="text-xs tabular-nums text-ink-faint">
                      {band.chips.length}
                    </span>
                  </h2>
                  <div className="mt-3 flex flex-wrap gap-2.5">
                    {band.chips.map((c) => (
                      <MovementChip key={c.slug} chip={c} />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        </main>
      </div>
    </PullToRefresh>
  );
}
