import Link from "next/link";
import { getWorks } from "@/lib/books";
import { getStats, getReadingStats } from "@/lib/insights";
import { formatYear } from "@/lib/display";
import { LibraryView } from "@/components/library-view";
import { ReadingStats } from "@/components/reading-stats";

export default function HomePage() {
  const works = getWorks();
  const stats = getStats(works);
  const reading = getReadingStats(works);
  const readCount = reading.read;

  const span =
    stats.earliestYear !== null && stats.latestYear !== null
      ? `${formatYear(stats.earliestYear)} – ${formatYear(stats.latestYear)}`
      : "—";

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-paper-edge bg-canvas/80 shadow-header backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-ink font-serif text-base italic text-canvas shadow-sm">
              L
            </span>
            <span className="text-[0.95rem] font-semibold tracking-tight text-ink">
              The Library
            </span>
          </div>
          <div className="flex items-center gap-4">
            <dl className="flex items-center divide-x divide-paper-edge">
              <HeaderStat label="Books" value={stats.works} />
              <HeaderStat label="Read" value={readCount} />
              <HeaderStat label="Authors" value={stats.authors} className="hidden sm:block" />
              <HeaderStat label="Span" value={span} className="hidden sm:block" />
            </dl>
            <Link
              href="/recommendations"
              className="hidden items-center gap-2 rounded-xl border border-paper-edge bg-paper px-3.5 py-2 text-[0.8rem] font-semibold text-ink-soft shadow-sm transition hover:border-ink-faint hover:text-ink sm:inline-flex"
            >
              Recommendations
            </Link>
            <Link
              href="/reading"
              className="hidden items-center gap-2 rounded-xl border border-paper-edge bg-paper px-3.5 py-2 text-[0.8rem] font-semibold text-ink-soft shadow-sm transition hover:border-ink-faint hover:text-ink sm:inline-flex"
            >
              Import reads
            </Link>
            <Link
              href="/capture"
              className="inline-flex items-center gap-2 rounded-xl bg-accent px-3.5 py-2 text-[0.8rem] font-semibold text-white shadow-sm transition hover:bg-ink focus-visible:ring-2 focus-visible:ring-accent"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M14.5 4h-5L8 6H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-4l-1.5-2Z" />
                <circle cx="12" cy="13" r="3.2" />
              </svg>
              <span className="hidden sm:inline">Add books</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="enter-up mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
        <LibraryView works={works} reading={<ReadingStats stats={reading} />} />
      </main>
    </div>
  );
}

function HeaderStat({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string | number;
  className?: string;
}) {
  return (
    <div className={`px-4 text-right leading-none first:pl-0 last:pr-0 sm:px-5 ${className}`}>
      <dd className="font-serif text-lg tabular-nums text-ink">{value}</dd>
      <dt className="mt-1 text-[0.6rem] font-medium uppercase tracking-[0.14em] text-ink-faint">
        {label}
      </dt>
    </div>
  );
}
