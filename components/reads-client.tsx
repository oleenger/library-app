"use client";

import { useMemo } from "react";
import type { Work } from "@/lib/types";
import type { ForeignRead } from "@/lib/insights";
import { getReadsPageData, getReadingStats } from "@/lib/insights";
import { useOfflineWorks } from "@/lib/offline/use-offline-works";
import { ReadsView } from "@/components/reads-view";

// Client bridge for the reading record: same offline-mirror fallback as the
// Library, deriving the reads page data client-side so it works offline.
// Foreign reads (imported from Goodreads but not in the library) are resolved
// on the server and passed straight through.
export function ReadsClient({
  initialWorks,
  foreignReads,
}: {
  initialWorks: Work[];
  foreignReads: ForeignRead[];
}) {
  const works = useOfflineWorks(initialWorks);
  const data = useMemo(() => getReadsPageData(works), [works]);
  const stats = useMemo(() => getReadingStats(works), [works]);

  return <ReadsView data={data} stats={stats} foreignReads={foreignReads} />;
}
