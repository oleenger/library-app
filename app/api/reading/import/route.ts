// Upload a Goodreads CSV export, match its "read" shelf against existing library
// works, persist the matches to data/read_status.csv, and rebuild the catalogue
// so read flags show immediately. No new works are ever created from the export.

import { resetCatalogue } from "@/lib/books";
import { resetDb } from "@/lib/db";
import { runImport } from "@/lib/intake/importer";
import { matchReads } from "@/lib/reading/match";
import { mergeAndWriteReadStatus } from "@/lib/reading/store";

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
    result = await matchReads(csv);
  } catch (err) {
    return Response.json(
      { error: "matching failed", detail: String(err) },
      { status: 500 },
    );
  }

  // Persist and rebuild only when something matched, so a bad upload is a no-op.
  const total = mergeAndWriteReadStatus(result.matches);
  if (result.matches.length > 0) {
    runImport();
    resetDb();
    resetCatalogue();
  }

  return Response.json({
    totalReadsInExport: result.totalReads,
    matched: result.matches.length,
    exactMatches: result.tier1,
    llmMatches: result.tier2,
    unmatchedLibrary: result.unmatchedLibrary,
    unmatchedGoodreads: result.unmatchedGoodreads,
    llmUsed: result.llmUsed,
    llmError: result.llmError,
    totalReadWorks: total.length,
  });
}
