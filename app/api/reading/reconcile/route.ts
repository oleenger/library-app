// Reconcile the persisted Goodreads shelf against the current catalogue. Marks
// any newly-addable books read without a re-upload. Manual read statuses are
// preserved. Called from the reading page button and automatically after an
// intake commit.

import { reconcileReads } from "@/lib/reading/reconcile";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST() {
  try {
    const r = await reconcileReads();
    return Response.json({
      shelfSize: r.shelfSize,
      matched: r.matches.length,
      exactMatches: r.tier1,
      llmMatches: r.tier2,
      unmatchedLibrary: r.unmatchedLibrary,
      unmatchedGoodreads: r.unmatchedGoodreads,
      llmUsed: r.llmUsed,
      llmError: r.llmError,
      totalReadWorks: r.totalReadWorks,
    });
  } catch (err) {
    console.error("[reading/reconcile] failed:", err);
    return Response.json(
      { error: "reconcile failed", detail: String(err) },
      { status: 500 },
    );
  }
}
