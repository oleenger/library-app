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
const SHORT_PERIOD: Record<string, string> = {
  "Classical / Antiquity": "Classical",
  "Renaissance / Early Modern": "Renaissance",
  "Enlightenment / Neoclassical": "Enlightenment",
  "Victorian / 19th century": "Victorian",
  "Modernist / early 20th century": "Modernist",
  "Postwar / late 20th century": "Postwar",
};

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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-serif text-3xl tracking-[-0.025em]">Collection</h2>
          <p className="mt-1 text-sm text-ink-soft">Find your next book.</p>
        </div>
        <div className="flex items-center gap-2">
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
              className="h-11 w-full rounded-xl border border-paper-edge bg-paper-raised pl-11 pr-4 text-sm text-ink shadow-sm placeholder:text-ink-faint hover:border-ink-faint focus:border-accent focus:outline-none sm:w-80"
            />
          </label>
          {active && (
            <button
              type="button"
              onClick={() => setFilters(EMPTY_FILTERS)}
              className="h-11 shrink-0 rounded-xl border border-paper-edge bg-paper-raised px-4 text-xs font-semibold transition-colors hover:border-ink-faint"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-6 py-6 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-8 lg:py-8">
        <aside className="min-w-0">
          <details className="rounded-xl border border-paper-edge bg-paper-raised p-4 lg:hidden">
            <summary className="cursor-pointer text-sm font-semibold">Filter collection</summary>
            <div className="mt-5 space-y-6">
              <FacetGroup title="Movements" options={movementOpts} selected={filters.movement} onToggle={(v) => toggle("movement", v)} />
              <FacetGroup title="Authors" options={authorOpts} selected={filters.author} onToggle={(v) => toggle("author", v)} />
            </div>
          </details>
          <div className="hidden space-y-7 lg:block">
            <FacetGroup title="Movements" options={movementOpts} selected={filters.movement} onToggle={(v) => toggle("movement", v)} />
            <FacetGroup title="Authors" options={authorOpts} selected={filters.author} onToggle={(v) => toggle("author", v)} />
          </div>
        </aside>

        <section className="min-w-0">
          <Timeline
            options={periodOpts}
            selected={filters.period}
            onToggle={(v) => toggle("period", v)}
          />

        <div className="mt-7 flex items-center justify-between border-b border-paper-edge pb-3">
          <div>
            <p className="text-sm font-medium" aria-live="polite">
              {filtered.length} {filtered.length === 1 ? "work" : "works"}
              {active ? " found" : ""}
            </p>
          </div>
          <span className="hidden text-xs text-ink-faint sm:block">
            Title A–Z
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
      <h2 className="mb-2 text-xs font-semibold text-ink">
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
                className={`flex min-h-9 w-max items-center justify-between gap-3 rounded-lg px-3 text-left text-sm transition-colors lg:min-h-0 lg:w-full lg:px-2 lg:py-1.5 ${
                  isSel
                    ? "bg-accent text-white"
                    : "text-ink-soft hover:bg-paper-raised hover:text-ink"
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
    <div>
      <h2 className="mb-3 text-xs font-semibold text-ink">
        Period
      </h2>
      <ul className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
        {options.map((o) => {
          const isSel = o.value === selected;
          return (
            <li key={o.value}>
              <button
                type="button"
                onClick={() => onToggle(o.value)}
                aria-pressed={isSel}
                className={`group flex h-10 shrink-0 items-center gap-2 rounded-lg border px-3 text-left text-sm transition-colors ${
                  isSel
                    ? "border-accent bg-accent text-white"
                    : "border-paper-edge bg-paper-raised text-ink-soft hover:border-ink-faint hover:text-ink"
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${periodDot(o.value)}`} aria-hidden />
                <span>
                  {SHORT_PERIOD[o.value] ?? o.value}
                </span>
                <span className={`text-xs tabular-nums ${isSel ? "text-white/70" : "text-ink-faint"}`}>
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
