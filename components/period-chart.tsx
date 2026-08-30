"use client";

import { useMemo } from "react";
import type { Work } from "@/lib/types";
import { periodColor, shortPeriod } from "@/lib/display";
import { facetOptions, type Filters } from "@/lib/facets";

interface Props {
  works: Work[];
  filters: Filters;
  /** Live count of the filtered result set (shown as the headline figure). */
  count: number;
  /** Whether any filter is active (adjusts the "found" wording). */
  active: boolean;
  /** Toggle the period facet when a bar is clicked. */
  onSelectPeriod: (period: string) => void;
}

/**
 * A compact, horizontal bar chart of works per period, sat between the top bar
 * and the table controls. Doubles as the headline count and as a one-tap period
 * filter — clicking a bar toggles that period. Bars cascade with other active
 * filters (they reflect every filter except period itself).
 */
export function PeriodChart({ works, filters, count, active, onSelectPeriod }: Props) {
  const options = useMemo(
    () => facetOptions(works, filters, "period"),
    [works, filters],
  );
  const max = useMemo(
    () => options.reduce((m, o) => Math.max(m, o.count), 0),
    [options],
  );
  const selected = filters.period;

  return (
    <section
      className="mb-4 rounded-2xl border border-paper-edge bg-white px-5 py-4 shadow-card sm:px-6 sm:py-5"
      aria-label="Works by period"
    >
      <header className="mb-4 flex items-baseline justify-between gap-4">
        <p className="leading-none" aria-live="polite">
          <span className="font-serif text-3xl font-bold text-ink">{count}</span>
          <span className="ml-1.5 text-sm text-ink-soft">
            {count === 1 ? "book" : "books"}
            {active ? " found" : ""}
          </span>
        </p>
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-ink-faint">
          {selected ? (
            <button
              type="button"
              onClick={() => onSelectPeriod(selected)}
              className="transition-colors hover:text-accent"
            >
              Clear period ✕
            </button>
          ) : (
            "By period"
          )}
        </p>
      </header>

      {options.length === 0 ? (
        <p className="py-4 text-center text-sm text-ink-soft">
          No periods to chart.
        </p>
      ) : (
        <ol className="space-y-2">
          {options.map((o) => {
            const color = periodColor(o.value);
            const pct = max > 0 ? Math.max((o.count / max) * 100, 2) : 0;
            const isSel = selected === o.value;
            const dimmed = Boolean(selected) && !isSel;
            return (
              <li key={o.value}>
                <button
                  type="button"
                  onClick={() => onSelectPeriod(o.value)}
                  aria-pressed={isSel}
                  className={`group grid w-full grid-cols-[6.5rem_1fr_2rem] items-center gap-3 rounded-lg py-0.5 text-left transition-opacity sm:grid-cols-[8rem_1fr_2.25rem] ${
                    dimmed ? "opacity-40 hover:opacity-100" : "opacity-100"
                  }`}
                  title={`${o.value} — ${o.count}`}
                >
                  <span
                    className={`truncate text-xs transition-colors ${
                      isSel
                        ? "font-semibold text-ink"
                        : "text-ink-soft group-hover:text-ink"
                    }`}
                  >
                    {shortPeriod(o.value)}
                  </span>
                  <span className="relative h-2.5 w-full overflow-hidden rounded-full bg-paper-sunken">
                    <span
                      className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-700 ease-out"
                      style={{ width: `${pct}%`, backgroundColor: color }}
                    />
                  </span>
                  <span
                    className={`text-right text-xs tabular-nums transition-colors ${
                      isSel ? "font-semibold text-ink" : "text-ink-faint"
                    }`}
                  >
                    {o.count}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
