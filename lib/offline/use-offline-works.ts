"use client";

import { useEffect, useState } from "react";
import type { Work } from "@/lib/types";
import {
  fetchAndStoreCatalogue,
  loadCatalogue,
  saveCatalogue,
} from "@/lib/offline/catalogue";

// Resolves the works to render, bridging server data and the offline mirror:
//
//  - Server provided works (online SSR, or cached HTML): render them and
//    refresh the local mirror so it always mirrors the last-seen catalogue.
//  - Server provided nothing (client-only cold start): read the mirror; if it
//    is empty, try the network once via /api/catalogue.
//
// Search/filter/derived stats are computed client-side by the callers from the
// returned array, so browsing keeps working offline.
export function useOfflineWorks(initialWorks: Work[]): Work[] {
  const [works, setWorks] = useState<Work[]>(initialWorks);

  useEffect(() => {
    let cancelled = false;

    if (initialWorks.length > 0) {
      // Keep the durable mirror in step with what we just rendered.
      void saveCatalogue(initialWorks);
      return;
    }

    // No server data — hydrate from the mirror, then the network as a fallback.
    (async () => {
      const local = await loadCatalogue();
      if (!cancelled && local && local.works.length > 0) {
        setWorks(local.works);
        return;
      }
      const fetched = await fetchAndStoreCatalogue();
      if (!cancelled && fetched) setWorks(fetched);
    })();

    return () => {
      cancelled = true;
    };
  }, [initialWorks]);

  return works;
}
