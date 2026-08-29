// The dedicated "Read books" page body. Server component (pure presentation over
// getReadsPageData): year-by-year + per-period + per-movement breakdowns, then the
// full list of read works grouped by year, newest first.

import Link from "next/link";
import type { ReadsPageData } from "@/lib/insights";
import { formatReadDate, periodColor } from "@/lib/display";

const SHORT_PERIOD: Record<string, string> = {
  "Classical / Antiquity": "Classical",
  "Renaissance / Early Modern": "Renaissance",
  "Enlightenment / Neoclassical": "Enlightenment",
  "Victorian / 19th century": "Victorian",
  "Modernist / early 20th century": "Modernist",
  "Postwar / late 20th century": "Postwar",
};

export function ReadsView({ data }: { data: ReadsPageData }) {
  if (data.read === 0) {
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

  const groups = groupByYear(data.books);
  const maxYear = Math.max(...data.byYear.map((y) => y.count), 1);
  const maxMovement = Math.max(...data.byMovement.map((m) => m.count), 1);

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:gap-12">
      {/* Statistics rail */}
      <aside className="space-y-8 lg:sticky lg:top-24 lg:self-start">
        {/* Reads by year — the movement over time */}
        <Panel title="By year">
          <ul className="space-y-2.5">
            {data.byYear.map((y) => (
              <li key={y.year} className="flex items-center gap-3">
                <span className="w-10 shrink-0 text-xs tabular-nums text-ink-soft">
                  {y.year}
                </span>
                <span className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-paper-sunken">
                  <span
                    className="absolute inset-y-0 left-0 rounded-full bg-accent"
                    style={{ width: `${(y.count / maxYear) * 100}%` }}
                  />
                </span>
                <span className="w-6 shrink-0 text-right text-xs tabular-nums text-ink-faint">
                  {y.count}
                </span>
              </li>
            ))}
          </ul>
        </Panel>

        {/* Read vs owned, per period */}
        <Panel title="By period">
          <ul className="space-y-2.5">
            {data.byPeriod.map((p) => {
              const pct = p.total > 0 ? (p.read / p.total) * 100 : 0;
              const color = periodColor(p.period);
              return (
                <li key={p.period} className="flex items-center gap-3">
                  <span className="w-24 shrink-0 truncate text-xs text-ink-soft">
                    {SHORT_PERIOD[p.period] ?? p.period}
                  </span>
                  <span className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-paper-sunken">
                    <span
                      className="absolute inset-y-0 left-0 rounded-full"
                      style={{ width: `${pct}%`, backgroundColor: color }}
                    />
                  </span>
                  <span className="w-10 shrink-0 text-right text-xs tabular-nums text-ink-faint">
                    {p.read}/{p.total}
                  </span>
                </li>
              );
            })}
          </ul>
        </Panel>

        {/* Reads by movement */}
        {data.byMovement.length > 0 && (
          <Panel title="By movement">
            <ul className="space-y-2.5">
              {data.byMovement.slice(0, 12).map((m) => (
                <li key={m.movement} className="flex items-center gap-3">
                  <span className="w-28 shrink-0 truncate text-xs text-ink-soft" title={m.movement}>
                    {m.movement}
                  </span>
                  <span className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-paper-sunken">
                    <span
                      className="absolute inset-y-0 left-0 rounded-full bg-ink/70"
                      style={{ width: `${(m.count / maxMovement) * 100}%` }}
                    />
                  </span>
                  <span className="w-6 shrink-0 text-right text-xs tabular-nums text-ink-faint">
                    {m.count}
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
        )}
      </aside>

      {/* The list, grouped by year (newest first) */}
      <section className="min-w-0 space-y-8">
        {groups.map((g) => (
          <div key={g.label}>
            <div className="mb-2 flex items-baseline justify-between border-b border-paper-edge pb-2">
              <h2 className="font-serif text-xl text-ink">{g.label}</h2>
              <span className="text-xs text-ink-faint">
                {g.books.length} {g.books.length === 1 ? "book" : "books"}
              </span>
            </div>
            <ul className="divide-y divide-paper-edge">
              {g.books.map((b) => (
                <li key={b.id}>
                  <Link
                    href={`/book/${b.id}`}
                    className="group flex items-center gap-4 py-3 transition-colors hover:bg-paper-sunken/60"
                  >
                    <span
                      className="h-9 w-1 shrink-0 rounded-full"
                      style={{ backgroundColor: periodColor(b.period) }}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-serif text-lg leading-tight text-ink transition-colors group-hover:text-accent">
                        {b.title}
                      </h3>
                      <p className="mt-0.5 truncate text-sm text-ink-soft">{b.author}</p>
                    </div>
                    {b.rating != null && (
                      <span className="hidden shrink-0 text-sm tabular-nums text-amber-500 sm:inline">
                        {"★".repeat(b.rating)}
                        <span className="text-ink-faint">{"★".repeat(5 - b.rating)}</span>
                      </span>
                    )}
                    <span className="w-24 shrink-0 text-right text-xs tabular-nums text-ink-faint">
                      {formatReadDate(b.dateRead)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-paper-edge bg-paper p-5 shadow-card">
      <p className="mb-4 text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-ink-faint">
        {title}
      </p>
      {children}
    </div>
  );
}

interface YearGroup {
  label: string;
  books: ReadsPageData["books"];
}

/** Split the (already date-desc sorted) list into year headers; undated last. */
function groupByYear(books: ReadsPageData["books"]): YearGroup[] {
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
