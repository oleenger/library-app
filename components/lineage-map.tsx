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

          {/* Timeline graph: the connected led-to flow, oldest at the top. */}
          <section className="mb-10">
            <Link
              href="/foundations"
              className="group mb-5 flex items-center gap-3 rounded-2xl border border-dashed border-paper-edge bg-paper-sunken/50 px-4 py-3.5 transition-colors hover:border-ink-faint"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-paper text-ink-faint shadow-sm">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M12 3v18M5 8l7-5 7 5M4 21h16" />
                </svg>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-ink group-hover:text-accent">
                  Before the movements — Foundations
                </span>
                <span className="block text-xs text-ink-soft">
                  The pre-movement classics the whole lineage grows from.
                </span>
              </span>
              <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-ink-faint transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="m9 6 6 6-6 6" />
              </svg>
            </Link>

            <div className="rounded-[1.75rem] border border-paper-edge bg-paper-raised px-4 py-6 shadow-card sm:px-7 sm:py-8">
              <LineageGraph graph={graph} />
            </div>
            <p className="mt-3 px-1 text-xs text-ink-faint">
              A single line runs oldest to newest. Filled dots are movements in
              your library; hollow dots are gaps. Colour marks the period, and the
              threads trace what each movement grew into.
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
