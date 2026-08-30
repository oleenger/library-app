import { getWorks } from "@/lib/books";
import { LibraryClient } from "@/components/library-client";
import { PullToRefresh } from "@/components/pull-to-refresh";

// The catalogue is served from the Next Data Cache (see lib/books.ts): Supabase
// is hit only after a mutation or a pull-to-refresh invalidates the tag, not on
// every request. force-dynamic keeps the render per-request; the data is cached.
export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const [works, { q }] = await Promise.all([getWorks(), searchParams]);

  return (
    <PullToRefresh>
      <div className="min-h-screen">
        <LibraryClient initialWorks={works} initialQuery={q ?? ""} />
      </div>
    </PullToRefresh>
  );
}
