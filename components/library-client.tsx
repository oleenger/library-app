"use client";

import type { Work } from "@/lib/types";
import { useOfflineWorks } from "@/lib/offline/use-offline-works";
import { LibraryView } from "@/components/library-view";

// Client bridge for the Library: renders server works when present, falls back
// to the offline mirror when they are not.
export function LibraryClient({
  initialWorks,
  initialQuery,
}: {
  initialWorks: Work[];
  initialQuery?: string;
}) {
  const works = useOfflineWorks(initialWorks);

  return <LibraryView works={works} initialQuery={initialQuery} />;
}
