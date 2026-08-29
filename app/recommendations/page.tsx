import Link from "next/link";
import { getWorks } from "@/lib/books";
import { readingFingerprint } from "@/lib/recommend/fingerprint";
import { readRecommendations } from "@/lib/recommend/store";
import { RecommendationsView } from "@/components/recommendations-view";

export const metadata = { title: "Recommendations — Personal Library" };

// Server component: reads the persisted recommendation cache and the current
// reading fingerprint. It NEVER calls the model — generation is an explicit
// action handled by POST /api/recommendations. Refreshing this page is free.
export default function RecommendationsPage() {
  const works = getWorks();
  const readCount = works.filter((w) => w.reading).length;
  const fingerprint = readingFingerprint(works);
  const cache = readRecommendations();

  // The cached set is "stale" when the library has changed since it was made.
  const stale = cache != null && cache.fingerprint !== fingerprint;

  return (
    <div className="min-h-screen">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="group flex items-center gap-2.5 text-sm">
          <span className="grid h-8 w-8 place-items-center rounded-lg border border-paper-edge bg-white shadow-sm transition-colors group-hover:border-ink-faint">
            ←
          </span>
          <span className="font-semibold">The Library</span>
        </Link>
        <Link
          href="/reads"
          className="hidden items-center gap-2 rounded-xl border border-paper-edge bg-paper px-3.5 py-2 text-[0.8rem] font-semibold text-ink-soft shadow-sm transition hover:border-ink-faint hover:text-ink sm:inline-flex"
        >
          Read books
        </Link>
      </nav>

      <main className="enter-up mx-auto max-w-3xl px-4 pb-24 pt-8 sm:px-6 lg:px-8">
        <header className="mb-8">
          <h1 className="font-serif text-4xl leading-none tracking-[-0.02em] sm:text-5xl">
            Recommendations
          </h1>
          <p className="mt-3 text-[0.95rem] text-ink-soft">
            Suggested by an LLM from the {readCount}{" "}
            {readCount === 1 ? "book" : "books"} you&rsquo;ve read. Regenerated
            only when your reading history changes.
          </p>
        </header>

        <RecommendationsView
          initial={cache}
          stale={stale}
          readCount={readCount}
        />
      </main>
    </div>
  );
}
