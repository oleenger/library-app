"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Work } from "@/lib/types";
import { formatYear, periodColor } from "@/lib/display";
import {
  applyFilters,
  facetOptions,
  hasActiveFilters,
  EMPTY_FILTERS,
  type FacetKey,
  type FacetOption,
  type Filters,
} from "@/lib/facets";

interface Props {
  works: Work[];
}

const AUTHOR_LIMIT = 10;
const MOVEMENT_LIMIT = 12;
const SHORT_PERIOD: Record<string, string> = {
  "Classical / Antiquity": "Classical",
  "Renaissance / Early Modern": "Renaissance",
  "Enlightenment / Neoclassical": "Enlightenment",
  "Victorian / 19th century": "Victorian",
  "Modernist / early 20th century": "Modernist",
  "Postwar / late 20th century": "Postwar",
};

function shortPeriod(period: string | null): string {
  if (!period) return "Unclassified";
  return SHORT_PERIOD[period] ?? period;
}

export function LibraryView({ works }: Props) {
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);

  const filtered = useMemo(() => applyFilters(works, filters), [works, filters]);

  // Cascading facets: each option list is counted over works constrained by the
  // *other* active filters, so choosing one axis reshapes the rest.
  const periodOpts = useMemo(
    () => facetOptions(works, filters, "period"),
    [works, filters],
  );
  const movementOpts = useMemo(
    () => facetOptions(works, filters, "movement", MOVEMENT_LIMIT),
    [works, filters],
  );
  const authorOpts = useMemo(
    () => facetOptions(works, filters, "author", AUTHOR_LIMIT),
    [works, filters],
  );

  const active = hasActiveFilters(filters);

  function toggle(key: FacetKey, value: string) {
    setFilters((f) => ({ ...f, [key]: f[key] === value ? "" : value }));
  }

  return (
    <div className="pt-7 sm:pt-9">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl leading-none tracking-[-0.02em] sm:text-4xl">
            Collection
          </h1>
          <p className="mt-2 text-sm text-ink-soft">
            {works.length} books · browse by period, movement, and author
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="mt-6 flex items-center gap-2">
        <label className="relative flex-1">
          <span className="sr-only">Search by title or author</span>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="6" />
            <path d="m16 16 4 4" />
          </svg>
          <input
            type="search"
            value={filters.query}
            onChange={(e) =>
              setFilters((f) => ({ ...f, query: e.target.value }))
            }
            placeholder="Search title or author"
            className="h-12 w-full rounded-2xl border border-paper-edge bg-white pl-11 pr-4 text-sm text-ink shadow-card transition-colors placeholder:text-ink-faint hover:border-ink-faint focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/15"
          />
        </label>
        {active && (
          <button
            type="button"
            onClick={() => setFilters(EMPTY_FILTERS)}
            className="h-12 shrink-0 rounded-2xl border border-paper-edge bg-white px-4 text-xs font-semibold text-ink-soft transition-colors hover:border-ink-faint hover:text-ink"
          >
            Clear
          </button>
        )}
      </div>

      {/* Period chips */}
      <Timeline
        options={periodOpts}
        selected={filters.period}
        onToggle={(v) => toggle("period", v)}
      />

      <div className="grid gap-8 pt-8 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-10">
        <aside className="min-w-0">
          <details className="group rounded-2xl border border-paper-edge bg-white p-4 shadow-card lg:hidden">
            <summary className="flex cursor-pointer items-center justify-between text-sm font-semibold">
              Filters
              <span className="text-ink-faint transition-transform group-open:rotate-180">
                ⌄
              </span>
            </summary>
            <div className="mt-5 space-y-6">
              <FacetGroup title="Movements" options={movementOpts} selected={filters.movement} onToggle={(v) => toggle("movement", v)} />
              <FacetGroup title="Authors" options={authorOpts} selected={filters.author} onToggle={(v) => toggle("author", v)} />
            </div>
          </details>
          <div className="hidden lg:sticky lg:top-24 lg:block">
            <div className="space-y-7 rounded-2xl border border-paper-edge bg-white p-5 shadow-card">
              <FacetGroup title="Movements" options={movementOpts} selected={filters.movement} onToggle={(v) => toggle("movement", v)} />
              <FacetGroup title="Authors" options={authorOpts} selected={filters.author} onToggle={(v) => toggle("author", v)} />
            </div>
          </div>
        </aside>

        <section className="min-w-0">
          <div className="overflow-hidden rounded-2xl border border-paper-edge bg-white shadow-card">
            <div className="flex items-center justify-between border-b border-paper-edge px-5 py-4 sm:px-6">
              <p className="text-sm text-ink-soft" aria-live="polite">
                <span className="font-semibold text-ink">{filtered.length}</span>{" "}
                {filtered.length === 1 ? "book" : "books"}
                {active ? " found" : ""}
              </p>
              <span className="text-xs text-ink-faint">Title A–Z</span>
            </div>

            {filtered.length === 0 ? (
              <div className="px-6 py-24 text-center">
                <p className="font-serif text-2xl">No books found.</p>
                <p className="mt-2 text-sm text-ink-soft">
                  Try a different search or filter.
                </p>
              </div>
            ) : (
              <ol className="divide-y divide-paper-edge">
                {filtered.map((work) => (
                  <BookRow key={work.id} work={work} />
                ))}
              </ol>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

/** A sidebar list of clickable, count-bearing facet values. */
function FacetGroup({
  title,
  options,
  selected,
  onToggle,
}: {
  title: string;
  options: FacetOption[];
  selected: string;
  onToggle: (value: string) => void;
}) {
  if (options.length === 0) return null;
  return (
    <div className="min-w-0">
      <h2 className="mb-2 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-ink-faint">
        {title}
      </h2>
      <ul className="flex flex-wrap gap-2 lg:flex-col lg:gap-0.5">
        {options.map((o) => {
          const isSel = o.value === selected;
          return (
            <li key={o.value}>
              <button
                type="button"
                onClick={() => onToggle(o.value)}
                aria-pressed={isSel}
                aria-label={`${o.value}, ${o.count} works`}
                className={`flex min-h-9 w-max items-center justify-between gap-3 rounded-lg px-3 text-left text-sm transition-colors lg:min-h-0 lg:w-full lg:px-2.5 lg:py-2 ${
                  isSel
                    ? "bg-accent text-white"
                    : "text-ink-soft hover:bg-paper-sunken hover:text-ink"
                }`}
              >
                <span className="truncate">{o.value}</span>
                <span
                  className={`shrink-0 tabular-nums text-xs ${
                    isSel ? "text-white/70" : "text-ink-faint"
                  }`}
                >
                  {o.count}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Compact period facet. */
function Timeline({
  options,
  selected,
  onToggle,
}: {
  options: FacetOption[];
  selected: string;
  onToggle: (value: string) => void;
}) {
  if (options.length === 0) return null;
  return (
    <ul className="no-scrollbar -mx-4 mt-5 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
      {options.map((o) => {
        const isSel = o.value === selected;
        const color = periodColor(o.value);
        return (
          <li key={o.value}>
            <button
              type="button"
              onClick={() => onToggle(o.value)}
              aria-pressed={isSel}
              style={
                isSel
                  ? { backgroundColor: color, borderColor: color }
                  : { backgroundColor: `${color}14`, borderColor: `${color}33` }
              }
              className={`flex h-9 shrink-0 items-center gap-2 rounded-full border px-3.5 text-sm font-medium transition-transform hover:-translate-y-px ${
                isSel ? "text-white" : "text-ink"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${isSel ? "bg-white/80" : ""}`}
                style={isSel ? undefined : { backgroundColor: color }}
                aria-hidden
              />
              <span>{SHORT_PERIOD[o.value] ?? o.value}</span>
              <span className={`text-xs tabular-nums ${isSel ? "text-white/70" : "text-ink-faint"}`}>
                {o.count}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function BookRow({ work }: { work: Work }) {
  const { classification: c } = work;
  const color = periodColor(c.period);
  return (
    <li>
      <Link
        href={`/book/${work.id}`}
        className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-paper-sunken/50 sm:px-6"
      >
        <span
          className="h-9 w-1 shrink-0 rounded-full"
          style={{ backgroundColor: color }}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-serif text-lg leading-tight text-ink transition-colors group-hover:text-accent">
            {work.title}
          </h3>
          <p className="mt-0.5 truncate text-sm text-ink-soft">{work.author}</p>
          {/* period shown inline on phones, where the tag column is hidden */}
          <span
            className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-medium sm:hidden"
            style={{ color }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} aria-hidden />
            {shortPeriod(c.period)}
          </span>
        </div>
        <span
          className="hidden shrink-0 rounded-full px-3 py-1 text-xs font-medium sm:inline-block"
          style={{ backgroundColor: `${color}1f`, color }}
        >
          {shortPeriod(c.period)}
        </span>
        <span className="w-12 shrink-0 text-right text-sm tabular-nums text-ink-faint">
          {formatYear(work.originalYear)}
        </span>
        <span
          className="hidden shrink-0 text-ink-faint transition-transform group-hover:translate-x-0.5 group-hover:text-accent sm:inline"
          aria-hidden
        >
          →
        </span>
      </Link>
    </li>
  );
}
