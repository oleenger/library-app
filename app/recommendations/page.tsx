import { getWorks } from "@/lib/books";
import { selectCanonPaths } from "@/lib/canon/select";
import { RecommendationsView } from "@/components/recommendations-view";
import { AppHeader } from "@/components/app-header";
import { PullToRefresh } from "@/components/pull-to-refresh";

export const metadata = { title: "Canon — Personal Library" };
export const dynamic = "force-dynamic";

// Server component: renders the static curated canon (lib/canon/paths.ts) joined
// to the reader's live holdings. It never calls the model — the canon is
// hand-authored and fixed, so refreshing this page is free. An optional
// ?movement= query preselects a movement (used by the lineage → canon link).
export default async function RecommendationsPage({
  searchParams,
}: {
  searchParams: Promise<{ movement?: string }>;
}) {
  const { movement } = await searchParams;
  const works = await getWorks();
  const paths = selectCanonPaths(works);

  return (
    <PullToRefresh>
      <div className="min-h-screen">
        <AppHeader mode="back" />

        <main className="enter-up mx-auto max-w-4xl px-4 pb-28 pt-6 sm:px-6 lg:px-8">
          <RecommendationsView
            paths={paths}
            workCount={works.length}
            initialMovement={movement ?? null}
          />
        </main>
      </div>
    </PullToRefresh>
  );
}
