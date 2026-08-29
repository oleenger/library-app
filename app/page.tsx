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
    <main className="mx-auto max-w-[90rem] px-4 pb-16 sm:px-7 lg:px-10">
      <header className="enter-up border-b border-ink pt-5 sm:pt-7">
        <div className="flex items-center justify-between border-b border-paper-edge pb-4">
          <div className="flex items-center gap-3">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-ink font-serif text-sm italic text-paper-raised">
              L
            </span>
            <span className="text-[0.68rem] font-semibold uppercase tracking-[0.22em]">
              Private collection
            </span>
          </div>
          <p className="text-[0.68rem] uppercase tracking-[0.18em] text-ink-faint">
            Catalogue / {stats.works}
          </p>
        </div>

        <div className="grid gap-8 py-10 sm:py-14 lg:grid-cols-[minmax(0,1.35fr)_minmax(28rem,0.65fr)] lg:items-end lg:gap-16 lg:py-20">
          <div>
            <p className="mb-4 flex items-center gap-3 text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-accent">
              <span className="h-px w-8 bg-accent" />
              The reading archive
            </p>
            <h1 className="max-w-4xl font-serif text-[clamp(3.25rem,8vw,7.5rem)] leading-[0.82] tracking-[-0.055em]">
              The Library
            </h1>
            <p className="mt-6 max-w-xl text-sm leading-6 text-ink-soft sm:text-base sm:leading-7">
              A personal collection mapped across centuries, literary periods,
              and the movements that connect them.
            </p>
          </div>

          <dl className="grid grid-cols-2 border-l border-t border-paper-edge sm:grid-cols-3">
            <Stat label="Works" value={stats.works} />
            <Stat label="Authors" value={stats.authors} />
            <Stat label="Periods" value={stats.periods} />
            <Stat label="Movements" value={stats.movements} />
            <div className="col-span-2 sm:col-span-2">
              <Stat label="Collection span" value={span} wide />
            </div>
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
  wide = false,
}: {
  label: string;
  value: string | number;
  wide?: boolean;
}) {
  return (
    <div className="min-h-24 border-b border-r border-paper-edge p-4 sm:min-h-28 sm:p-5">
      <dt className="text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-ink-faint">
        {label}
      </dt>
      <dd
        className={`mt-4 font-serif leading-none tabular-nums ${
          wide ? "text-2xl sm:text-3xl" : "text-4xl sm:text-5xl"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
