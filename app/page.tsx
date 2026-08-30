import { getWorks } from "@/lib/books";
import { LibraryClient } from "@/components/library-client";
import { PullToRefresh } from "@/components/pull-to-refresh";

// Catalogue is read live from Supabase per request, so render dynamically.
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
