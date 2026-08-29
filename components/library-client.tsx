"use client";

import { useMemo } from "react";
import type { Work } from "@/lib/types";
import { getReadingStats } from "@/lib/insights";
import { useOfflineWorks } from "@/lib/offline/use-offline-works";
import { LibraryView } from "@/components/library-view";
import { ReadingStats } from "@/components/reading-stats";

// Client bridge for the Library: renders server works when present, falls back
// to the offline mirror when they are not, and derives the reading summary from
// whichever set is resolved so it stays correct offline.
export function LibraryClient({ initialWorks }: { initialWorks: Work[] }) {
  const works = useOfflineWorks(initialWorks);
  const reading = useMemo(() => getReadingStats(works), [works]);

  return (
    <LibraryView works={works} reading={<ReadingStats stats={reading} />} />
  );
}
