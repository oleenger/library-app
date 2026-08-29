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
  reading?: React.ReactNode;
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

export function LibraryView({ works, reading }: Props) {
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
    <div className="pt-8 sm:pt-12">
      {/* Search + reading summary */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="sticky top-16 z-20 -mx-4 flex flex-1 items-center gap-2.5 bg-canvas/95 px-4 py-3 backdrop-blur-md sm:static sm:mx-0 sm:bg-transparent sm:px-0 sm:py-0 sm:backdrop-blur-none">
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
              className="h-12 w-full rounded-full border border-paper-edge bg-paper pl-11 pr-4 text-sm text-ink shadow-card transition-colors placeholder:text-ink-faint hover:border-ink-faint focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/12"
            />
          </label>
          {active && (
            <button
              type="button"
              onClick={() => setFilters(EMPTY_FILTERS)}
              className="h-12 shrink-0 rounded-full border border-paper-edge bg-paper px-5 text-xs font-semibold text-ink-soft transition-colors hover:border-ink-faint hover:text-ink"
            >
              Clear
            </button>
          )}
        </div>
        {reading}
      </div>

      {/* Period chips with the read-status toggle aligned to their right.
          On phones the toggle lives in the list header instead, to save a row. */}
      <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Timeline
          options={periodOpts}
          selected={filters.period}
          onToggle={(v) => toggle("period", v)}
        />
        <ReadFilter
          value={filters.readStatus}
          onChange={(v) => setFilters((f) => ({ ...f, readStatus: v }))}
          className="hidden shrink-0 self-start shadow-card sm:inline-flex lg:self-auto"
        />
      </div>

      <div className="grid gap-8 pt-8 lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-10">
        <aside className="min-w-0">
          <details className="group rounded-2xl border border-paper-edge bg-paper p-4 shadow-card lg:hidden">
            <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold">
              Movements &amp; authors
              <span className="text-ink-faint transition-transform group-open:rotate-180">
                ⌄
              </span>
            </summary>
            <div className="mt-5 space-y-7">
              <FacetGroup title="Movements" options={movementOpts} selected={filters.movement} onToggle={(v) => toggle("movement", v)} />
              <FacetGroup title="Authors" options={authorOpts} selected={filters.author} onToggle={(v) => toggle("author", v)} />
            </div>
          </details>
          <div className="hidden lg:sticky lg:top-24 lg:block">
            <div className="space-y-7 rounded-2xl border border-paper-edge bg-paper p-6 shadow-card">
              <FacetGroup title="Movements" options={movementOpts} selected={filters.movement} onToggle={(v) => toggle("movement", v)} />
              <div className="border-t border-paper-edge" />
              <FacetGroup title="Authors" options={authorOpts} selected={filters.author} onToggle={(v) => toggle("author", v)} />
            </div>
          </div>
        </aside>

        <section className="min-w-0">
          <div className="overflow-hidden rounded-2xl border border-paper-edge bg-paper shadow-card">
            <div className="flex items-center justify-between border-b border-paper-edge px-5 py-4 sm:px-6">
              <p className="text-sm text-ink-soft" aria-live="polite">
                <span className="font-serif text-lg text-ink">{filtered.length}</span>{" "}
                {filtered.length === 1 ? "book" : "books"}
                {active ? " found" : ""}
              </p>
              <ReadFilter
                value={filters.readStatus}
                onChange={(v) => setFilters((f) => ({ ...f, readStatus: v }))}
                className="sm:hidden"
              />
              <span className="hidden text-[0.7rem] font-medium uppercase tracking-[0.12em] text-ink-faint sm:inline">
                Title A–Z
              </span>
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

/** Segmented All / Read / Unread control. */
function ReadFilter({
  value,
  onChange,
  className = "",
}: {
  value: Filters["readStatus"];
  onChange: (value: Filters["readStatus"]) => void;
  className?: string;
}) {
  return (
    <div
      className={`inline-flex shrink-0 rounded-full border border-paper-edge bg-paper p-0.5 ${className}`}
    >
      {(
        [
          ["", "All"],
          ["read", "Read"],
          ["unread", "Unread"],
        ] as const
      ).map(([v, label]) => {
        const isSel = value === v;
        return (
          <button
            key={v || "all"}
            type="button"
            onClick={() => onChange(v)}
            aria-pressed={isSel}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
              isSel ? "bg-ink text-canvas shadow-sm" : "text-ink-soft hover:text-ink"
            }`}
          >
            {label}
          </button>
        );
      })}
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
      <h2 className="mb-3 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-ink-faint">
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
                className={`flex min-h-9 w-max items-center justify-between gap-3 rounded-lg px-3 text-left text-sm transition-colors lg:min-h-0 lg:w-full lg:px-3 lg:py-2 ${
                  isSel
                    ? "bg-accent text-white shadow-sm"
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

/** Chronological period facet — clean neutral pills led by a colour swatch. */
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
    <ul className="no-scrollbar -mx-4 flex flex-1 gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
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
                  : undefined
              }
              className={`flex h-9 shrink-0 items-center gap-2 rounded-full border px-3.5 text-sm font-medium transition-all hover:-translate-y-px ${
                isSel
                  ? "text-white shadow-sm"
                  : "border-paper-edge bg-paper text-ink hover:border-ink-faint"
              }`}
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: isSel ? "rgba(255,255,255,0.9)" : color }}
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
        className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-paper-sunken/60 active:bg-paper-sunken sm:px-6"
      >
        <span
          className="h-10 w-1 shrink-0 rounded-full"
          style={{ backgroundColor: color }}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-serif text-lg leading-tight text-ink transition-colors group-hover:text-accent">
            {work.title}
          </h3>
          <p className="mt-0.5 truncate text-sm text-ink-soft">{work.author}</p>
          {/* period + read status shown inline on phones, where the tag columns are hidden */}
          <span className="mt-1.5 flex items-center gap-2 text-xs font-medium sm:hidden">
            <span className="inline-flex items-center gap-1.5" style={{ color }}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} aria-hidden />
              {shortPeriod(c.period)}
            </span>
            {work.reading && (
              <span className="inline-flex items-center gap-1 text-emerald-700">
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5" aria-hidden>
                  <path
                    fillRule="evenodd"
                    d="M16.7 5.3a1 1 0 0 1 0 1.4l-7 7a1 1 0 0 1-1.4 0l-3.5-3.5a1 1 0 1 1 1.4-1.4l2.8 2.8 6.3-6.3a1 1 0 0 1 1.4 0Z"
                    clipRule="evenodd"
                  />
                </svg>
                Read
              </span>
            )}
          </span>
        </div>
        {work.reading && (
          <span
            className="hidden shrink-0 items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 sm:inline-flex"
            title={
              work.reading.dateRead ? `Read ${work.reading.dateRead}` : "Read"
            }
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5" aria-hidden>
              <path
                fillRule="evenodd"
                d="M16.7 5.3a1 1 0 0 1 0 1.4l-7 7a1 1 0 0 1-1.4 0l-3.5-3.5a1 1 0 1 1 1.4-1.4l2.8 2.8 6.3-6.3a1 1 0 0 1 1.4 0Z"
                clipRule="evenodd"
              />
            </svg>
            Read
          </span>
        )}
        <span className="hidden shrink-0 items-center gap-2 rounded-full border border-paper-edge bg-paper px-3 py-1 text-xs font-medium text-ink-soft sm:inline-flex">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} aria-hidden />
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
