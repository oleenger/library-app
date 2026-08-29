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
import { pickFeatured } from "@/lib/insights";

interface Props {
  works: Work[];
  /** Id of the work featured on first paint (chosen server-side for SSR parity). */
  featuredId: string | null;
}

const AUTHOR_LIMIT = 10;
const MOVEMENT_LIMIT = 12;

export function LibraryView({ works, featuredId }: Props) {
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [shuffle, setShuffle] = useState(0);

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

  const featured = useMemo(() => {
    if (shuffle === 0 && featuredId) {
      return works.find((w) => w.id === featuredId) ?? pickFeatured(works);
    }
    return pickFeatured(works);
  }, [works, featuredId, shuffle]);

  function toggle(key: FacetKey, value: string) {
    setFilters((f) => ({ ...f, [key]: f[key] === value ? "" : value }));
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[15rem_1fr]">
      <aside className="flex flex-col gap-6">
        <input
          type="search"
          value={filters.query}
          onChange={(e) => setFilters((f) => ({ ...f, query: e.target.value }))}
          placeholder="Search title or author…"
          aria-label="Search by title or author"
          className="w-full rounded-md border border-paper-edge bg-paper-raised px-3 py-2 font-sans text-sm text-ink placeholder:text-ink-faint focus:border-ink-soft focus:outline-none"
        />

        {active && (
          <button
            type="button"
            onClick={() => setFilters(EMPTY_FILTERS)}
            className="self-start font-sans text-xs uppercase tracking-[0.12em] text-ink-soft underline underline-offset-4 hover:text-ink"
          >
            Clear all filters
          </button>
        )}

        <FacetGroup
          title="Movements"
          options={movementOpts}
          selected={filters.movement}
          onToggle={(v) => toggle("movement", v)}
        />
        <FacetGroup
          title="Popular authors"
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

        {!active && featured && (
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <FeaturedCard work={featured} onShuffle={() => setShuffle((n) => n + 1)} />
            <TagCloud
              options={movementOpts}
              onPick={(v) => toggle("movement", v)}
            />
          </div>
        )}

        <p className="mt-8 font-sans text-xs text-ink-faint" aria-live="polite">
          {filtered.length} {filtered.length === 1 ? "work" : "works"}
          {active ? " matching" : ""}
        </p>

        {filtered.length === 0 ? (
          <p className="mt-16 text-center font-serif text-lg text-ink-soft">
            No works match these filters.
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto">
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
        )}
      </section>
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
    <div>
      <h2 className="mb-2 font-sans text-xs font-medium uppercase tracking-[0.12em] text-ink-faint">
        {title}
      </h2>
      <ul className="flex flex-col gap-0.5">
        {options.map((o) => {
          const isSel = o.value === selected;
          return (
            <li key={o.value}>
              <button
                type="button"
                onClick={() => onToggle(o.value)}
                aria-pressed={isSel}
                className={`flex w-full items-baseline justify-between gap-2 rounded px-2 py-1 text-left font-sans text-sm transition-colors ${
                  isSel
                    ? "bg-ink text-paper-raised"
                    : "text-ink-soft hover:bg-paper-raised hover:text-ink"
                }`}
              >
                <span className="truncate">{o.value}</span>
                <span
                  className={`shrink-0 tabular-nums text-xs ${
                    isSel ? "text-paper-edge" : "text-ink-faint"
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
      <h2 className="mb-3 font-sans text-xs font-medium uppercase tracking-[0.12em] text-ink-faint">
        Across the periods
      </h2>
      <ul className="flex flex-col gap-1.5">
        {options.map((o) => {
          const isSel = o.value === selected;
          const pct = max > 0 ? Math.round((o.count / max) * 100) : 0;
          return (
            <li key={o.value}>
              <button
                type="button"
                onClick={() => onToggle(o.value)}
                aria-pressed={isSel}
                className="group grid w-full grid-cols-[9rem_1fr_2rem] items-center gap-3 text-left"
              >
                <span
                  className={`truncate font-sans text-xs ${
                    isSel ? "text-ink" : "text-ink-soft group-hover:text-ink"
                  }`}
                >
                  {o.value}
                </span>
                <span className="h-3 rounded-sm bg-paper-edge/60">
                  <span
                    className={`block h-full rounded-sm transition-all ${periodDot(
                      o.value,
                    )} ${isSel ? "opacity-100" : "opacity-70 group-hover:opacity-100"}`}
                    style={{ width: `${Math.max(pct, 4)}%` }}
                  />
                </span>
                <span className="text-right font-sans text-xs tabular-nums text-ink-faint">
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

/** A single spotlighted work, with a control to draw another at random. */
function FeaturedCard({ work, onShuffle }: { work: Work; onShuffle: () => void }) {
  const { classification: c } = work;
  return (
    <div className="flex flex-col rounded-lg border border-paper-edge bg-paper-raised p-5">
      <div className="flex items-center justify-between">
        <p className="font-sans text-xs uppercase tracking-[0.16em] text-ink-faint">
          Featured
        </p>
        <button
          type="button"
          onClick={onShuffle}
          className="font-sans text-xs text-ink-soft underline underline-offset-4 hover:text-ink"
        >
          Another
        </button>
      </div>
      <Link
        href={`/book/${work.id}`}
        className="mt-3 font-serif text-2xl leading-tight text-ink hover:underline hover:underline-offset-2"
      >
        {work.title}
      </Link>
      <p className="mt-1 font-sans text-sm text-ink-soft">{work.author}</p>
      <p className="mt-auto pt-4 font-sans text-xs text-ink-faint">
        {[c.period, c.primaryMovement, formatYear(work.originalYear)]
          .filter(Boolean)
          .join(" · ")}
      </p>
    </div>
  );
}

/** "Browse by movement" entry point, sized by frequency. */
function TagCloud({
  options,
  onPick,
}: {
  options: FacetOption[];
  onPick: (value: string) => void;
}) {
  if (options.length === 0) return null;
  const max = Math.max(...options.map((o) => o.count));
  return (
    <div className="rounded-lg border border-paper-edge p-5">
      <p className="mb-3 font-sans text-xs uppercase tracking-[0.16em] text-ink-faint">
        Browse by movement
      </p>
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {options.map((o) => {
          // Scale roughly 0.8rem–1.35rem by relative frequency.
          const size = 0.8 + (max > 0 ? o.count / max : 0) * 0.55;
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => onPick(o.value)}
              style={{ fontSize: `${size}rem` }}
              className="font-serif leading-tight text-ink-soft hover:text-ink hover:underline hover:underline-offset-2"
            >
              {o.value}
            </button>
          );
        })}
      </div>
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
      className={`py-2 pr-4 font-sans text-xs font-medium uppercase tracking-[0.12em] text-ink-faint ${className}`}
    >
      {children}
    </th>
  );
}

function BookRow({ work }: { work: Work }) {
  const { classification: c } = work;
  return (
    <tr className="group border-b border-paper-edge transition-colors hover:bg-paper-raised">
      <td className="py-2.5 pr-4 align-top">
        <Link
          href={`/book/${work.id}`}
          className="font-serif text-base text-ink hover:underline hover:underline-offset-2"
        >
          {work.title}
        </Link>
      </td>
      <td className="py-2.5 pr-4 align-top font-sans text-sm text-ink-soft">
        {work.author}
      </td>
      <td className="py-2.5 pr-4 align-top">
        <span className="flex items-center gap-2 font-sans text-sm text-ink-soft">
          <span
            className={`h-2 w-2 shrink-0 rounded-full ${periodDot(c.period)}`}
            aria-hidden
          />
          {c.period ?? "Unclassified"}
        </span>
      </td>
      <td className="py-2.5 pr-4 align-top font-sans text-sm text-ink-soft">
        {c.primaryMovement ?? "—"}
      </td>
      <td className="py-2.5 align-top text-right font-sans text-sm tabular-nums text-ink-faint">
        {formatYear(work.originalYear)}
      </td>
    </tr>
  );
}
