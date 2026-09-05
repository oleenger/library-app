import { getWorks } from "@/lib/books";
import { movementDetails } from "@/lib/canon/select";
import { RecommendationsView } from "@/components/recommendations-view";
import { AppHeader } from "@/components/app-header";
import { PullToRefresh } from "@/components/pull-to-refresh";

export const metadata = { title: "Canon — Personal Library" };
export const dynamic = "force-dynamic";

// Server component: renders the static curated canon (essentials + reading paths
// + lineage from the version-controlled TSVs) joined to the reader's live
// holdings. It never calls the model — the canon is fixed, so refreshing this
// page is free. An optional ?movement= query preselects a movement (used by the
// metro map and every "lineage" link).
export default async function RecommendationsPage({
  searchParams,
}: {
  searchParams: Promise<{ movement?: string }>;
}) {
  const { movement } = await searchParams;
  const works = await getWorks();
  const details = movementDetails(works);

  // Every owned book, trimmed for the "I own this" gap-link picker.
  const candidates = works.map((w) => ({
    id: w.id,
    title: w.title,
    author: w.author,
    language: w.language ?? null,
  }));

  return (
    <PullToRefresh>
      <div className="min-h-screen">
        <AppHeader mode="back" />

        <main className="enter-up mx-auto max-w-4xl px-4 pb-28 pt-6 sm:px-6 lg:px-8">
          <RecommendationsView
            details={details}
            workCount={works.length}
            initialMovement={movement ?? null}
            candidates={candidates}
          />
        </main>
      </div>
    </PullToRefresh>
  );
}
