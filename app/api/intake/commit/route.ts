// Stage 3: commit. Accept the human-reviewed candidates, validate each against
// the taxonomy-bound schema, drop ones that already exist in the library, append
// the rest to the master CSV, and rebuild the catalogue DB in-process. CSV stays
// the source of truth (proposal §5.1) so added books survive future re-imports.

import { resetCatalogue } from "@/lib/books";
import { resetDb } from "@/lib/db";
import {
  appendRowsToMaster,
  runImport,
  type BookRow,
} from "@/lib/intake/importer";
import { CandidateSchema } from "@/lib/intake/schema";
import { readFileSync } from "node:fs";
import path from "node:path";
import Papa from "papaparse";
import { z } from "zod";

export const runtime = "nodejs";

const BodySchema = z.object({
  candidates: z.array(z.unknown()).min(1),
});

// Normalised work key mirroring the importer's title+author identity, used to
// skip candidates already present in the master CSV.
const workKey = (title: string, author: string) =>
  `${title.trim().toLowerCase()}\u0000${author.trim().toLowerCase()}`;

function existingWorkKeys(): Set<string> {
  const csvPath = path.join(process.cwd(), "data", "library_master.csv");
  const { data } = Papa.parse<{ title?: string; author?: string }>(
    readFileSync(csvPath, "utf8"),
    { header: true, skipEmptyLines: true, transformHeader: (h) => h.trim() },
  );
  const keys = new Set<string>();
  for (const r of data) {
    if (r.title?.trim() && r.author?.trim()) keys.add(workKey(r.title, r.author));
  }
  return keys;
}

function candidateToRow(c: z.infer<typeof CandidateSchema>): BookRow {
  return {
    title: c.title,
    author: c.author,
    first_published: c.first_published != null ? String(c.first_published) : "",
    original_language: c.original_language ?? "",
    edition_language: c.edition_language ?? "",
    publisher: c.publisher ?? "",
    edition: c.edition ?? "",
    period: c.period ?? "",
    primary_movement: c.primary_movement ?? "",
    secondary_movements: (c.secondary_movements ?? []).join("|"),
    notes: c.notes ?? "",
  };
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const parsedBody = BodySchema.safeParse(body);
  if (!parsedBody.success) {
    return Response.json(
      { error: "expected { candidates: [...] } with at least one entry" },
      { status: 400 },
    );
  }

  const existing = existingWorkKeys();
  const seen = new Set<string>();
  const rows: BookRow[] = [];
  const duplicates: { title: string; author: string }[] = [];
  const rejected: { index: number; issues: unknown }[] = [];

  parsedBody.data.candidates.forEach((raw, index) => {
    // Re-validate on the server: the client may have edited fields, and this
    // enforces the taxonomy enums for period / movements.
    const parsed = CandidateSchema.safeParse(raw);
    if (!parsed.success) {
      rejected.push({ index, issues: parsed.error.issues });
      return;
    }
    const c = parsed.data;
    const key = workKey(c.title, c.author);
    if (existing.has(key) || seen.has(key)) {
      duplicates.push({ title: c.title, author: c.author });
      return;
    }
    seen.add(key);
    rows.push(candidateToRow(c));
  });

  let added = 0;
  let importSummary: ReturnType<typeof runImport> | null = null;
  if (rows.length > 0) {
    ({ added } = appendRowsToMaster(rows));
    importSummary = runImport();
    // The catalogue DB was just replaced on disk; drop stale in-process caches
    // so the library grid reflects the new books without a server restart.
    resetDb();
    resetCatalogue();
  }

  return Response.json({
    added,
    duplicates,
    rejected,
    import: importSummary,
  });
}
