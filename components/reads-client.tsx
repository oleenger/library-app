"use client";

import { useMemo } from "react";
import type { Work } from "@/lib/types";
import { getReadsPageData } from "@/lib/insights";
import { useOfflineWorks } from "@/lib/offline/use-offline-works";
import { ReadsView } from "@/components/reads-view";

// Client bridge for the reading record: same offline-mirror fallback as the
// Library, deriving the reads page data client-side so it works offline.
export function ReadsClient({ initialWorks }: { initialWorks: Work[] }) {
  const works = useOfflineWorks(initialWorks);
  const data = useMemo(() => getReadsPageData(works), [works]);

  return <ReadsView data={data} />;
}
