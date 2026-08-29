import Link from "next/link";
import { getWorks } from "@/lib/books";
import { libraryFingerprint, readingFingerprint } from "@/lib/recommend/fingerprint";
import { readCache } from "@/lib/recommend/store";
import { RecommendationsView } from "@/components/recommendations-view";

export const metadata = { title: "Recommendations — Personal Library" };
export const dynamic = "force-dynamic";

// Server component: reads the persisted recommendation cache and the current
// source fingerprints. It NEVER calls the model — generation is an explicit
// action handled by POST /api/recommendations. Refreshing this page is free.
export default async function RecommendationsPage() {
  const works = await getWorks();
  const readCount = works.filter((w) => w.reading).length;
  const cache = await readCache();

  const tasteFp = readingFingerprint(works);
  const canonFp = libraryFingerprint(works);

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

      <main className="enter-up mx-auto max-w-4xl px-4 pb-24 pt-8 sm:px-6 lg:px-8">
        <header className="mb-10">
          <h1 className="font-serif text-4xl leading-none tracking-[-0.02em] sm:text-5xl">
            Recommendations
          </h1>
          <p className="mt-3 text-[0.95rem] text-ink-soft">
            Books to read next, and the major works your library is missing.
          </p>
        </header>

        <RecommendationsView
          taste={cache.taste ?? null}
          canon={cache.canon ?? null}
          tasteStale={cache.taste != null && cache.taste.fingerprint !== tasteFp}
          canonStale={cache.canon != null && cache.canon.fingerprint !== canonFp}
          readCount={readCount}
          workCount={works.length}
        />
      </main>
    </div>
  );
}
