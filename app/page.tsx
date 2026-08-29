import { getWorks } from "@/lib/books";
import { getStats } from "@/lib/insights";
import { formatYear } from "@/lib/display";
import { LibraryView } from "@/components/library-view";

export default function HomePage() {
  const works = getWorks();
  const stats = getStats(works);

  const span =
    stats.earliestYear !== null && stats.latestYear !== null
      ? `${formatYear(stats.earliestYear)} – ${formatYear(stats.latestYear)}`
      : "—";

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-paper-edge bg-white/90 shadow-header backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:h-16 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-ink font-serif text-sm italic text-white">
              L
            </span>
            <span className="text-sm font-semibold tracking-tight">
              The Library
            </span>
          </div>
          <dl className="flex items-center gap-5 sm:gap-7">
            <HeaderStat label="Books" value={stats.works} />
            <HeaderStat label="Authors" value={stats.authors} />
            <HeaderStat label="Span" value={span} className="hidden sm:block" />
          </dl>
        </div>
      </header>

      <main className="enter-up mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        <LibraryView works={works} />
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
    <div className={`text-right leading-none ${className}`}>
      <dd className="text-sm font-semibold tabular-nums text-ink">{value}</dd>
      <dt className="mt-1 text-[0.65rem] uppercase tracking-[0.12em] text-ink-faint">
        {label}
      </dt>
    </div>
  );
}
