import Dexie, { type Table } from "dexie";
import type { Work } from "@/lib/types";

// PWA Stage 3 — offline catalogue mirror.
// The whole catalogue is small (a few thousand lightweight works), so we store
// it as a single blob row rather than one row per work. That keeps sync atomic
// (replace the row) and reads trivial (one get). Cover images are NOT stored
// here; they rely on ordinary HTTP / service-worker caching and degrade
// gracefully offline (proposal §10).

export interface CatalogueSnapshot {
  /** Constant primary key — there is only ever one snapshot. */
  id: "catalogue";
  works: Work[];
  /** Epoch millis of the last successful sync. */
  syncedAt: number;
}

class LibraryDB extends Dexie {
  catalogue!: Table<CatalogueSnapshot, string>;

  constructor() {
    super("library-offline");
    this.version(1).stores({
      // Only the primary key needs indexing; the blob rides along.
      catalogue: "id",
    });
  }
}

// A single shared connection. Guarded so it is only constructed in the browser.
export const db: LibraryDB | null =
  typeof window === "undefined" ? null : new LibraryDB();
