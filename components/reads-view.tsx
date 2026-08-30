"use client";

// The "Read books" page body. Renders a styled read-progress summary, the full
// list of read works grouped by year (newest first), and moves the detailed
// breakdowns into a right slide-in Statistics pane (mirroring the front-page
// filter pane).

import Link from "next/link";
import { useMemo, useState } from "react";
import type {
  ForeignRead,
  ReadListItem,
  ReadsPageData,
  ReadingStats,
} from "@/lib/insights";
import { mergeReadList } from "@/lib/insights";
import { formatReadDate, periodColor, shortPeriod } from "@/lib/display";
import { StatsDrawer } from "@/components/stats-drawer";

export function ReadsView({
  data,
  stats,
  foreignReads,
}: {
  data: ReadsPageData;
  stats: ReadingStats;
  foreignReads: ForeignRead[];
}) {
  const [statsOpen, setStatsOpen] = useState(false);

  const items = useMemo(
    () => mergeReadList(data.books, foreignReads),
    [data.books, foreignReads],
  );

  // "Read this year" reflects the whole reading list, library and foreign alike.
  const readThisYear = useMemo(() => {
    const year = String(new Date().getFullYear());
    const foreign = foreignReads.filter((f) => f.dateRead?.startsWith(year)).length;
    return stats.readThisYear + foreign;
  }, [foreignReads, stats.readThisYear]);

  if (items.length === 0) {
    return (
      <section className="rounded-2xl border border-dashed border-paper-edge bg-paper px-6 py-16 text-center shadow-card">
        <h2 className="font-serif text-2xl text-ink">No reads yet</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-ink-soft">
          Import your Goodreads export to mark which library titles you have read.
        </p>
        <Link
          href="/reading"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-ink"
        >
          Import reads
        </Link>
      </section>
    );
  }

  const groups = groupByYear(items);

  return (
    <>
      <ReadSummary stats={stats} readThisYear={readThisYear} onOpenStats={() => setStatsOpen(true)} />

      <div className="mt-8 space-y-8">
        {groups.map((g) => (
          <div key={g.label}>
            <div className="mb-2 flex items-baseline justify-between px-1">
              <h2 className="font-serif text-xl text-ink">{g.label}</h2>
              <span className="text-xs text-ink-faint">
                {g.books.length} {g.books.length === 1 ? "book" : "books"}
              </span>
            </div>
            <div className="overflow-hidden rounded-2xl border border-paper-edge bg-paper shadow-card">
              <ul className="divide-y divide-paper-edge">
                {g.books.map((b) => (
                  <li key={b.key}>{b.inLibrary ? <LibraryRow b={b} /> : <ForeignRow b={b} />}</li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      <StatsDrawer open={statsOpen} onClose={() => setStatsOpen(false)} data={data} />
    </>
  );
}

/** A read book that is in the library — links through to its detail page. */
function LibraryRow({ b }: { b: ReadListItem }) {
  return (
    <Link
      href={`/book/${b.id}`}
      className="group flex items-stretch gap-3 px-4 py-3 transition-colors hover:bg-paper-sunken/60 sm:px-5"
    >
      <div className="min-w-0 flex-1">
        <h3 className="truncate font-serif text-[0.95rem] font-bold leading-tight text-ink transition-colors group-hover:text-accent">
          {b.title}
        </h3>
        <p className="mt-0.5 truncate text-xs text-ink-soft">{b.author}</p>
        <p className="mt-1.5 flex items-center gap-1.5 truncate text-[0.7rem] font-medium">
          <span style={{ color: periodColor(b.period) }}>{shortPeriod(b.period)}</span>
          {b.primaryMovement && (
            <>
              <span className="text-ink-faint/60">·</span>
              <span className="truncate text-ink-soft">{b.primaryMovement}</span>
            </>
          )}
        </p>
      </div>
      <RowMeta b={b} />
    </Link>
  );
}

/**
 * A read book imported from Goodreads that is NOT in the library. It has no
 * detail page, so the row is a plain (non-clickable) container. The whole row
 * is set slightly muted and carries a subtle "Not in library" tag so it reads
 * as outside the collection without shouting.
 */
function ForeignRow({ b }: { b: ReadListItem }) {
  return (
    <div className="flex items-stretch gap-3 px-4 py-3 opacity-70 sm:px-5">
      <div className="min-w-0 flex-1">
        <h3 className="truncate font-serif text-[0.95rem] font-bold leading-tight text-ink">
          {b.title}
        </h3>
        <p className="mt-0.5 truncate text-xs text-ink-soft">{b.author}</p>
        <p className="mt-1.5 flex items-center gap-1.5 truncate text-[0.7rem] font-medium">
          <span className="inline-flex items-center gap-1 text-ink-faint">
            <span
              className="h-1.5 w-1.5 rounded-full border border-ink-faint/50"
              aria-hidden
            />
            Not in library
          </span>
        </p>
      </div>
      <RowMeta b={b} />
    </div>
  );
}

/** Right-aligned date + rating, shared by both row kinds. */
function RowMeta({ b }: { b: ReadListItem }) {
  return (
    <div className="flex shrink-0 flex-col items-end justify-center gap-1 text-right">
      <span className="text-xs tabular-nums text-ink-faint">
        {formatReadDate(b.dateRead)}
      </span>
      {b.rating != null && (
        <span className="text-xs tabular-nums text-accent">
          {"★".repeat(b.rating)}
          <span className="text-ink-faint/40">{"★".repeat(5 - b.rating)}</span>
        </span>
      )}
    </div>
  );
}

/** Styled read-progress summary that stays on the page (not in the pane). */
function ReadSummary({
  stats,
  readThisYear,
  onOpenStats,
}: {
  stats: ReadingStats;
  readThisYear: number;
  onOpenStats: () => void;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-paper-edge bg-paper shadow-card">
      <div className="flex items-center gap-4 px-5 py-5">
        <Donut percent={stats.percent} />
        <div className="min-w-0 flex-1">
          <p className="font-serif text-2xl leading-none text-ink">
            {stats.read}
            <span className="ml-1.5 text-base text-ink-faint">
              / {stats.total} read
            </span>
          </p>
          <p className="mt-1.5 text-xs text-ink-soft">
            {readThisYear > 0 && `${readThisYear} this year`}
            {readThisYear > 0 && stats.averageRating != null && " · "}
            {stats.averageRating != null &&
              `${stats.averageRating.toFixed(1)}★ avg`}
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenStats}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-[0.7rem] border border-paper-edge bg-paper px-3 py-2 text-xs font-semibold text-ink-soft shadow-sm transition-colors hover:border-ink-faint hover:text-ink"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M5 20V10M12 20V4M19 20v-6" />
          </svg>
          Stats
        </button>
      </div>

      <div className="flex gap-2 border-t border-paper-edge px-5 py-3">
        <Link
          href="/reads/manage"
          className="inline-flex items-center gap-2 rounded-[0.7rem] border border-paper-edge bg-paper px-3 py-1.5 text-xs font-semibold text-ink-soft transition-colors hover:border-ink-faint hover:text-ink"
        >
          Edit read status
        </Link>
        <Link
          href="/reading"
          className="inline-flex items-center gap-2 rounded-[0.7rem] border border-paper-edge bg-paper px-3 py-1.5 text-xs font-semibold text-ink-soft transition-colors hover:border-ink-faint hover:text-ink"
        >
          Import reads
        </Link>
      </div>
    </section>
  );
}

function Donut({ percent }: { percent: number }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  const filled = (percent / 100) * c;
  return (
    <div className="relative grid h-14 w-14 shrink-0 place-items-center">
      <svg viewBox="0 0 100 100" className="h-14 w-14 -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#efece3" strokeWidth="11" />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="#1c6b50"
          strokeWidth="11"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${c - filled}`}
        />
      </svg>
      <span className="absolute font-serif text-sm tabular-nums text-ink">
        {percent}%
      </span>
    </div>
  );
}

// Period accent for the row's period label (movement stays uncoloured).
interface YearGroup {
  label: string;
  books: ReadListItem[];
}

/** Split the (already date-desc sorted) list into year headers; undated last. */
function groupByYear(books: ReadListItem[]): YearGroup[] {
  const groups: YearGroup[] = [];
  let current: YearGroup | null = null;
  for (const b of books) {
    const label = b.dateRead ? b.dateRead.slice(0, 4) : "Undated";
    if (!current || current.label !== label) {
      current = { label, books: [] };
      groups.push(current);
    }
    current.books.push(b);
  }
  return groups;
}
