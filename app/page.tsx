import { getMovements, getPeriods, getWorks } from "@/lib/books";
import { LibraryView } from "@/components/library-view";

export default function HomePage() {
  const works = getWorks();
  const periods = getPeriods(works);
  const movements = getMovements(works);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-8 border-b border-paper-edge pb-6">
        <p className="font-sans text-xs uppercase tracking-[0.2em] text-ink-faint">
          Personal Library · Proof of concept
        </p>
        <h1 className="mt-2 font-serif text-3xl text-ink sm:text-4xl">The Library</h1>
        <p className="mt-2 max-w-2xl font-sans text-sm text-ink-soft">
          {works.length} works, organised by literary period and movement.
        </p>
      </header>

      <LibraryView works={works} periods={periods} movements={movements} />
    </main>
  );
}
