import { getWorks } from "@/lib/books";
import { libraryFingerprint, readingFingerprint } from "@/lib/recommend/fingerprint";
import { readCache } from "@/lib/recommend/store";
import { RecommendationsView } from "@/components/recommendations-view";
import { AppHeader } from "@/components/app-header";
import { PullToRefresh } from "@/components/pull-to-refresh";

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
    <PullToRefresh>
      <div className="min-h-screen">
        <AppHeader mode="back" />

        <main className="enter-up mx-auto max-w-4xl px-4 pb-28 pt-6 sm:px-6 lg:px-8">
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
    </PullToRefresh>
  );
}
