"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Work } from "@/lib/types";
import { formatYear, periodColor, shortPeriod } from "@/lib/display";
import { AppHeader } from "@/components/app-header";
import { FilterDrawer } from "@/components/filter-drawer";
import { PeriodChart } from "@/components/period-chart";
import {
  applyFilters,
  EMPTY_FILTERS,
  type FacetKey,
  type Filters,
} from "@/lib/facets";

interface Props {
  works: Work[];
  initialQuery?: string;
}

const PAGE_SIZE = 50;

export function LibraryView({ works, initialQuery = "" }: Props) {
  const [filters, setFilters] = useState<Filters>({
    ...EMPTY_FILTERS,
    query: initialQuery,
  });
  const [filterOpen, setFilterOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const filtered = useMemo(() => applyFilters(works, filters), [works, filters]);
  // The header filter button reflects the facet axes it controls (not the
  // read-status toggle, which lives above the table).
  const facetActive = Boolean(filters.period || filters.movement || filters.author);

  // A changed result set (search / filter / read-status) starts from the top.
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [filters]);
  // Tapping the logo or the Library tab returns to the top of results.
  useEffect(() => {
    function home() {
      setVisibleCount(PAGE_SIZE);
    }
    window.addEventListener("library:home", home);
    return () => window.removeEventListener("library:home", home);
  }, []);

  const paged = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  // Load the next batch when the sentinel scrolls into view.
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!hasMore) return;
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((c) => c + PAGE_SIZE);
        }
      },
      { rootMargin: "400px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore]);
  function toggle(key: FacetKey, value: string) {
    setFilters((f) => ({ ...f, [key]: f[key] === value ? "" : value }));
  }

  return (
    <div>
      <AppHeader
        mode="library"
        query={filters.query}
        onQueryChange={(v) => setFilters((f) => ({ ...f, query: v }))}
        onFilterClick={() => setFilterOpen(true)}
        filterActive={facetActive}
        count={filtered.length}
      />

      <FilterDrawer
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        works={works}
        filters={filters}
        onToggle={toggle}
        onClear={() => setFilters({ ...EMPTY_FILTERS, query: filters.query })}
      />

      <main className="enter-up mx-auto max-w-7xl px-4 pb-28 pt-4 sm:px-6 lg:px-8">
        {/* Works-per-period chart */}
        <PeriodChart
          works={works}
          filters={filters}
          onSelectPeriod={(p) => toggle("period", p)}
        />

        {/* Format (left) / read-status (right) toggles, between chart and table */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 px-1">
          <FormatFilter
            value={filters.format}
            onChange={(v) => setFilters((f) => ({ ...f, format: v }))}
          />
          <ReadFilter
            value={filters.readStatus}
            onChange={(v) => setFilters((f) => ({ ...f, readStatus: v }))}
          />
        </div>

        <div className="overflow-hidden rounded-2xl border border-paper-edge bg-paper shadow-card">
          {filtered.length === 0 ? (
            <div className="px-6 py-24 text-center">
              <p className="font-serif text-2xl">No books found.</p>
              <p className="mt-2 text-sm text-ink-soft">
                Try a different search or filter.
              </p>
            </div>
          ) : (
            <ol className="divide-y divide-paper-edge">
              {paged.map((work) => (
                <BookRow key={work.id} work={work} />
              ))}
            </ol>
          )}
        </div>

        {hasMore && <div ref={sentinelRef} aria-hidden className="h-1" />}

        {filtered.length > 0 && (
          <p className="mt-4 px-1 text-center text-xs text-ink-faint">
            Showing {paged.length} of {filtered.length}
          </p>
        )}
      </main>
    </div>
  );
}

/** Segmented All / Physical / Electronic control. */
function FormatFilter({
  value,
  onChange,
}: {
  value: Filters["format"];
  onChange: (value: Filters["format"]) => void;
}) {
  return (
    <div className="inline-flex shrink-0 rounded-[0.7rem] border border-paper-edge bg-paper p-0.5">
      {(
        [
          ["", "All"],
          ["print", "Physical"],
          ["ebook", "Ebook"],
        ] as const
      ).map(([v, label]) => {
        const isSel = value === v;
        return (
          <button
            key={v || "all"}
            type="button"
            onClick={() => onChange(v)}
            aria-pressed={isSel}
            className={`rounded-[0.5rem] px-3 py-1 text-xs font-semibold transition-colors ${
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

/** Segmented All / Read / Unread control. */
function ReadFilter({
  value,
  onChange,
}: {
  value: Filters["readStatus"];
  onChange: (value: Filters["readStatus"]) => void;
}) {
  return (
    <div className="inline-flex shrink-0 rounded-[0.7rem] border border-paper-edge bg-paper p-0.5">
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
            className={`rounded-[0.5rem] px-3 py-1 text-xs font-semibold transition-colors ${
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

function BookRow({ work }: { work: Work }) {
  const { classification: c } = work;
  const color = periodColor(c.period);
  const read = Boolean(work.reading);
  const rating = work.reading?.rating ?? null;
  return (
    <li>
      <Link
        href={`/book/${work.id}`}
        className="group flex items-stretch gap-3 px-4 py-3 transition-colors hover:bg-paper-sunken/60 active:bg-paper-sunken sm:px-5"
      >
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-serif text-[0.95rem] font-bold leading-tight text-ink transition-colors group-hover:text-accent">
            {work.title}
          </h3>
          <p className="mt-0.5 truncate text-xs text-ink-soft">{work.author}</p>
          <p className="mt-1.5 flex items-center gap-1.5 truncate text-[0.7rem] font-medium">
            <span style={{ color }}>{shortPeriod(c.period)}</span>
            {c.primaryMovement && (
              <>
                <span className="text-ink-faint/60">·</span>
                <span className="truncate text-ink-soft">{c.primaryMovement}</span>
              </>
            )}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end justify-center gap-1">
          <span className="text-xs tabular-nums text-ink-faint">
            {formatYear(work.originalYear)}
          </span>
          {read &&
            (rating != null ? (
              <span
                className="text-xs tabular-nums text-accent"
                title={work.reading?.dateRead ? `Read ${work.reading.dateRead}` : "Read"}
                aria-label={`${rating} out of 5`}
              >
                {"★".repeat(rating)}
                <span className="text-ink-faint/40">{"★".repeat(5 - rating)}</span>
              </span>
            ) : (
              <span
                className="text-xs tabular-nums text-ink-faint/40"
                title={work.reading?.dateRead ? `Read ${work.reading.dateRead}` : "Read"}
                aria-label="Read, no rating"
              >
                {"★".repeat(5)}
              </span>
            ))}
        </div>
      </Link>
    </li>
  );
}
