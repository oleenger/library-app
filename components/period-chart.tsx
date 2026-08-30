"use client";

import { useMemo } from "react";
import type { Work } from "@/lib/types";
import { periodColor, shortPeriod } from "@/lib/display";
import { facetOptions, type Filters } from "@/lib/facets";

interface Props {
  works: Work[];
  filters: Filters;
  /** Toggle the period facet when a bar is clicked. */
  onSelectPeriod: (period: string) => void;
}

const TOP_N = 4;
const OTHER = "__other__";

/**
 * A compact, horizontal bar chart of works per period. To stay small it shows
 * the four largest periods plus an aggregated "Other" bar; the currently
 * selected period is always kept visible. Bars cascade with other active
 * filters and click-to-filter by period.
 */
export function PeriodChart({ works, filters, onSelectPeriod }: Props) {
  const selected = filters.period;

  const rows = useMemo(() => {
    const all = facetOptions(works, filters, "period");
    const ranked = [...all].sort((a, b) => b.count - a.count);

    const top = ranked.slice(0, TOP_N);
    // Guarantee the active selection stays on screen even if it isn't a top-4.
    if (selected && !top.some((o) => o.value === selected)) {
      const sel = ranked.find((o) => o.value === selected);
      if (sel) top.push(sel);
    }

    const shownValues = new Set(top.map((o) => o.value));
    const otherCount = ranked
      .filter((o) => !shownValues.has(o.value))
      .reduce((sum, o) => sum + o.count, 0);

    const list = top.map((o) => ({ ...o, isOther: false }));
    if (otherCount > 0) list.push({ value: OTHER, count: otherCount, isOther: true });
    return list;
  }, [works, filters, selected]);

  const max = useMemo(
    () => rows.reduce((m, o) => Math.max(m, o.count), 0),
    [rows],
  );

  if (rows.length === 0) return null;

  return (
    <section
      className="mb-4 rounded-2xl border border-paper-edge bg-white px-5 py-4 shadow-card sm:px-6"
      aria-label="Works by period"
    >
      <ol className="space-y-2">
        {rows.map((o) => {
          const color = o.isOther ? "#b8b1a6" : periodColor(o.value);
          const pct = max > 0 ? Math.max((o.count / max) * 100, 2) : 0;
          const isSel = !o.isOther && selected === o.value;
          const dimmed = Boolean(selected) && !isSel && !o.isOther;
          const label = o.isOther ? "Other" : shortPeriod(o.value);

          const inner = (
            <>
              <span
                className={`truncate text-xs transition-colors ${
                  isSel ? "font-semibold text-ink" : "text-ink-soft"
                } ${o.isOther ? "" : "group-hover:text-ink"}`}
              >
                {label}
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
            </>
          );

          const grid =
            "grid w-full grid-cols-[6rem_1fr_2rem] items-center gap-3 text-left sm:grid-cols-[8rem_1fr_2.25rem]";

          return (
            <li key={o.value}>
              {o.isOther ? (
                <div className={grid} title={`Other periods — ${o.count}`}>
                  {inner}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => onSelectPeriod(o.value)}
                  aria-pressed={isSel}
                  className={`group rounded-lg py-0.5 transition-opacity ${grid} ${
                    dimmed ? "opacity-40 hover:opacity-100" : "opacity-100"
                  }`}
                  title={`${o.value} — ${o.count}`}
                >
                  {inner}
                </button>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
