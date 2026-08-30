// Upload a Goodreads CSV export, match its "read" shelf against existing library
// works, and persist the matches to the Supabase read_status table. No new works
// are ever created from the export. Reads show immediately because the catalogue
// is read live from Supabase per request.

import { matchReadsAgainstLibrary } from "@/lib/reading/match";
import { parseGoodreadsReads } from "@/lib/reading/goodreads";
import { saveGoodreadsReads } from "@/lib/reading/goodreads-store";
import { mergeAndWriteReadStatus } from "@/lib/reading/store";
import { revalidateTag } from "next/cache";
import { CATALOGUE_TAG } from "@/lib/cache-tags";

export const runtime = "nodejs";

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB cap — a Goodreads export is tiny

export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "no file field" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return Response.json(
      { error: `file too large (${file.size} bytes, max ${MAX_BYTES})` },
      { status: 413 },
    );
  }

  const csv = await file.text();

  let result;
  try {
    // Persist the shelf first so it can be replayed later (reconcile) against
    // books added to the library after this upload — no re-upload needed.
    const reads = parseGoodreadsReads(csv);
    await saveGoodreadsReads(reads);
    result = await matchReadsAgainstLibrary(reads);
  } catch (err) {
    return Response.json(
      { error: "matching failed", detail: String(err) },
      { status: 500 },
    );
  }

  // Persist only when something matched, so a bad upload is a no-op.
  const merged = await mergeAndWriteReadStatus(result.matches);
  revalidateTag(CATALOGUE_TAG);

  return Response.json({
    totalReadsInExport: result.totalReads,
    matched: result.matches.length,
    exactMatches: result.tier1,
    llmMatches: result.tier2,
    unmatchedLibrary: result.unmatchedLibrary,
    unmatchedGoodreads: result.unmatchedGoodreads,
    llmUsed: result.llmUsed,
    llmError: result.llmError,
    totalReadWorks: merged.length,
  });
}
