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
    <main className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
      <header className="enter-up">
        <div className="flex h-16 items-center justify-between border-b border-paper-edge sm:h-20">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-ink font-serif text-base italic text-white">
              L
            </span>
            <div>
              <p className="text-sm font-semibold tracking-tight">The Library</p>
              <p className="text-xs text-ink-faint">Personal collection</p>
            </div>
          </div>
          <p className="hidden text-xs text-ink-faint sm:block">Updated collection</p>
        </div>

        <div className="border-b border-paper-edge py-9 sm:flex sm:items-end sm:justify-between sm:gap-12 sm:py-12">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
              Your reading archive
            </p>
            <h1 className="mt-3 max-w-2xl font-serif text-4xl leading-tight tracking-[-0.035em] sm:text-5xl lg:text-6xl">
              Books worth returning to.
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-ink-soft sm:text-base">
              Browse your collection by author, literary period, and movement.
            </p>
          </div>
          <dl className="mt-7 flex flex-wrap gap-x-7 gap-y-3 border-t border-paper-edge pt-5 sm:mt-0 sm:shrink-0 sm:border-0 sm:pt-0">
            <Stat label="Books" value={stats.works} />
            <Stat label="Authors" value={stats.authors} />
            <Stat label="Span" value={span} />
          </dl>
        </div>
      </header>

      <div className="enter-up-late">
        <LibraryView works={works} />
      </div>
    </main>
  );
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div>
      <dd className="font-serif text-2xl leading-none tabular-nums sm:text-3xl">{value}</dd>
      <dt className="mt-1 text-xs text-ink-faint">{label}</dt>
    </div>
  );
}
