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
          <dl className="flex items-center divide-x divide-paper-edge">
            <HeaderStat label="Books" value={stats.works} />
            <HeaderStat label="Authors" value={stats.authors} />
            <HeaderStat label="Span" value={span} className="hidden sm:block" />
          </dl>
        </div>
      </header>

      <main className="enter-up mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
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
    <div className={`px-4 text-right leading-none first:pl-0 last:pr-0 sm:px-5 ${className}`}>
      <dd className="font-serif text-lg tabular-nums text-ink">{value}</dd>
      <dt className="mt-1 text-[0.6rem] font-medium uppercase tracking-[0.14em] text-ink-faint">
        {label}
      </dt>
    </div>
  );
}
