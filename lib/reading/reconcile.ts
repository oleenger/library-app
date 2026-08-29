// Replay the persisted Goodreads shelf against the current catalogue and write
// any new matches. This is the "books added after the export was imported" path:
// it needs no upload because the shelf lives in goodreads_reads. Manual read
// statuses are preserved by mergeAndWriteReadStatus.

import { matchReadsAgainstLibrary, type MatchResult } from "./match";
import { loadGoodreadsReads } from "./goodreads-store";
import { mergeAndWriteReadStatus } from "./store";

export interface ReconcileResult extends MatchResult {
  /** read_status rows after the merge. */
  totalReadWorks: number;
  /** Rows on the persisted Goodreads shelf that were replayed. */
  shelfSize: number;
}

export async function reconcileReads(): Promise<ReconcileResult> {
  const shelf = await loadGoodreadsReads();
  const result = await matchReadsAgainstLibrary(shelf);
  const merged = await mergeAndWriteReadStatus(result.matches);
  return { ...result, totalReadWorks: merged.length, shelfSize: shelf.length };
}
