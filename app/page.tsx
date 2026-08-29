import { getWorks } from "@/lib/books";
import { getStats, pickFeatured } from "@/lib/insights";
import { formatYear } from "@/lib/display";
import { LibraryView } from "@/components/library-view";

export default function HomePage() {
  const works = getWorks();
  const stats = getStats(works);
  const featured = pickFeatured(works, works.length);

  const span =
    stats.earliestYear !== null && stats.latestYear !== null
      ? `${formatYear(stats.earliestYear)} – ${formatYear(stats.latestYear)}`
      : "—";

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-8 border-b border-paper-edge pb-6">
        <p className="font-sans text-xs uppercase tracking-[0.2em] text-ink-faint">
          Personal Library · Proof of concept
        </p>
        <h1 className="mt-2 font-serif text-3xl text-ink sm:text-4xl">The Library</h1>
        <dl className="mt-5 flex flex-wrap gap-x-8 gap-y-3">
          <Stat label="Works" value={stats.works} />
          <Stat label="Authors" value={stats.authors} />
          <Stat label="Movements" value={stats.movements} />
          <Stat label="Periods" value={stats.periods} />
          <Stat label="Spanning" value={span} />
        </dl>
      </header>

      <LibraryView works={works} featuredId={featured?.id ?? null} />
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <dt className="font-sans text-xs uppercase tracking-[0.12em] text-ink-faint">
        {label}
      </dt>
      <dd className="mt-0.5 font-serif text-2xl text-ink tabular-nums">{value}</dd>
    </div>
  );
}
