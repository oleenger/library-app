"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Work } from "@/lib/types";
import { formatYear, periodDot } from "@/lib/display";
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
    <div className="pt-7 sm:pt-10">
      <div className="flex flex-col gap-3 border-b border-ink pb-5 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-serif text-3xl tracking-[-0.03em] sm:text-4xl">
          Explore the shelves
        </h2>
        <div className="flex items-center gap-3">
          <label className="relative flex-1 sm:w-80">
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
              placeholder="Search the collection"
              className="h-12 w-full rounded-full border border-paper-edge bg-paper-raised pl-11 pr-4 text-sm text-ink shadow-[0_1px_0_rgba(23,23,19,0.04)] placeholder:text-ink-faint hover:border-ink-faint focus:border-ink focus:outline-none sm:w-80"
            />
          </label>
          {active && (
            <button
              type="button"
              onClick={() => setFilters(EMPTY_FILTERS)}
              className="h-12 shrink-0 rounded-full border border-ink px-4 text-[0.65rem] font-semibold uppercase tracking-[0.14em] transition-colors hover:bg-ink hover:text-paper-raised"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-8 py-7 lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-12 lg:py-10 xl:gap-16">
        <aside className="min-w-0 space-y-7 lg:border-r lg:border-paper-edge lg:pr-8">
          <FacetGroup
            title="Movements"
            options={movementOpts}
            selected={filters.movement}
            onToggle={(v) => toggle("movement", v)}
          />
          <FacetGroup
            title="Authors"
            options={authorOpts}
            selected={filters.author}
            onToggle={(v) => toggle("author", v)}
          />
        </aside>

        <section className="min-w-0">
        <Timeline
          options={periodOpts}
          selected={filters.period}
          onToggle={(v) => toggle("period", v)}
        />

        <div className="mt-10 flex items-end justify-between border-b border-ink pb-3">
          <div>
            <p className="text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-ink-faint">
              Catalogue
            </p>
            <p className="mt-1 text-sm text-ink-soft" aria-live="polite">
              {filtered.length} {filtered.length === 1 ? "work" : "works"}
              {active ? " found" : " in the collection"}
            </p>
          </div>
          <span className="hidden text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-ink-faint sm:block">
            Sorted A–Z
          </span>
        </div>

        {filtered.length === 0 ? (
          <div className="py-20 text-center">
            <p className="font-serif text-2xl">No works found.</p>
            <p className="mt-2 text-sm text-ink-soft">Try a different search or filter.</p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-paper-edge">
                  <Th>Title</Th>
                  <Th>Author</Th>
                  <Th>Period</Th>
                  <Th>Movement</Th>
                  <Th className="text-right">Year</Th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((w) => (
                  <BookRow key={w.id} work={w} />
                ))}
              </tbody>
            </table>
            </div>
            <ol className="divide-y divide-paper-edge md:hidden">
              {filtered.map((work, index) => (
                <BookCard key={work.id} work={work} index={index + 1} />
              ))}
            </ol>
          </>
        )}
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
      <h2 className="mb-3 text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-ink-faint">
        {title}
      </h2>
      <ul className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:px-0">
        {options.map((o) => {
          const isSel = o.value === selected;
          return (
            <li key={o.value}>
              <button
                type="button"
                onClick={() => onToggle(o.value)}
                aria-pressed={isSel}
                className={`flex min-h-10 w-max items-center justify-between gap-3 rounded-full border px-4 text-left text-sm transition-colors lg:min-h-0 lg:w-full lg:rounded-none lg:border-x-0 lg:border-t-0 lg:px-0 lg:py-2 ${
                  isSel
                    ? "border-ink bg-ink text-paper-raised lg:border-accent lg:bg-transparent lg:text-ink"
                    : "border-paper-edge bg-paper-raised text-ink-soft hover:border-ink-faint hover:text-ink lg:bg-transparent"
                }`}
              >
                <span className="truncate">{o.value}</span>
                <span
                  className={`shrink-0 tabular-nums text-xs ${
                    isSel ? "text-paper-edge lg:text-accent" : "text-ink-faint"
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

/** Period distribution as a horizontal bar chart that doubles as the period facet. */
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
  const max = Math.max(...options.map((o) => o.count));
  return (
    <div>
      <h2 className="mb-4 text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-ink-faint">
        Browse by period
      </h2>
      <ul className="no-scrollbar flex snap-x gap-2 overflow-x-auto pb-2 lg:grid lg:grid-cols-3 lg:gap-2 xl:grid-cols-5">
        {options.map((o) => {
          const isSel = o.value === selected;
          const pct = max > 0 ? Math.round((o.count / max) * 100) : 0;
          return (
            <li key={o.value}>
              <button
                type="button"
                onClick={() => onToggle(o.value)}
                aria-pressed={isSel}
                className={`group flex h-full w-40 shrink-0 snap-start flex-col rounded-md border p-3 text-left transition-colors lg:w-full ${
                  isSel
                    ? "border-ink bg-ink text-paper-raised"
                    : "border-paper-edge bg-paper-raised hover:border-ink-faint"
                }`}
              >
                <span className={`min-h-9 text-xs leading-4 ${isSel ? "text-paper-raised" : "text-ink-soft group-hover:text-ink"}`}>
                  {o.value}
                </span>
                <span className="mt-5 flex items-end justify-between gap-3">
                  <span
                    className={`block h-1.5 rounded-full transition-all ${periodDot(o.value)}`}
                    style={{ width: `${Math.max(pct, 12)}%` }}
                  />
                  <span className={`text-xs tabular-nums ${isSel ? "text-paper-edge" : "text-ink-faint"}`}>
                    {String(o.count).padStart(2, "0")}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Th({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={`py-3 pr-5 text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-ink-faint ${className}`}
    >
      {children}
    </th>
  );
}

function BookRow({ work }: { work: Work }) {
  const { classification: c } = work;
  return (
    <tr className="group border-b border-paper-edge transition-colors hover:bg-paper-raised">
      <td className="py-4 pr-5 align-top">
        <Link
          href={`/book/${work.id}`}
          className="font-serif text-lg leading-tight text-ink decoration-accent hover:underline hover:underline-offset-4"
        >
          {work.title}
        </Link>
      </td>
      <td className="py-4 pr-5 align-top text-sm text-ink-soft">
        {work.author}
      </td>
      <td className="py-4 pr-5 align-top">
        <span className="flex items-center gap-2 text-sm text-ink-soft">
          <span
            className={`h-2 w-2 shrink-0 rounded-full ${periodDot(c.period)}`}
            aria-hidden
          />
          {c.period ?? "Unclassified"}
        </span>
      </td>
      <td className="py-4 pr-5 align-top text-sm text-ink-soft">
        {c.primaryMovement ?? "—"}
      </td>
      <td className="py-4 align-top text-right text-sm tabular-nums text-ink-faint">
        {formatYear(work.originalYear)}
      </td>
    </tr>
  );
}

function BookCard({ work, index }: { work: Work; index: number }) {
  const { classification: c } = work;
  return (
    <li>
      <Link href={`/book/${work.id}`} className="block py-5">
        <div className="flex items-start gap-4">
          <span className="pt-1 text-[0.6rem] tabular-nums text-ink-faint">
            {String(index).padStart(2, "0")}
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="font-serif text-xl leading-tight tracking-[-0.015em]">
              {work.title}
            </h3>
            <p className="mt-1 text-sm text-ink-soft">{work.author}</p>
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-faint">
              <span className="flex items-center gap-1.5">
                <span className={`h-1.5 w-1.5 rounded-full ${periodDot(c.period)}`} aria-hidden />
                {c.period ?? "Unclassified"}
              </span>
              <span>{formatYear(work.originalYear)}</span>
            </div>
          </div>
          <span className="pt-1 text-accent" aria-hidden>↗</span>
        </div>
      </Link>
    </li>
  );
}
