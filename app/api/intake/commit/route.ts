// Stage 3: commit. Accept the human-reviewed candidates, validate each against
// the taxonomy-bound schema, drop ones that already exist in the library, and
// upsert the rest into Supabase. The catalogue is read live per request, so
// added books appear immediately with no rebuild step.

import {
  editionIdentity,
  groupRows,
  type BookRow,
} from "@/lib/intake/importer";
import { existingEditionSignatures, upsertGrouped } from "@/lib/intake/catalogue-db";
import { reconcileReads } from "@/lib/reading/reconcile";
import { CandidateSchema } from "@/lib/intake/schema";
import { z } from "zod";
import { revalidateTag } from "next/cache";
import { CATALOGUE_TAG } from "@/lib/cache-tags";

export const runtime = "nodejs";
export const maxDuration = 30;

const BodySchema = z.object({
  candidates: z.array(z.unknown()).min(1),
});

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

  try {
    const existing = await existingEditionSignatures();
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
      const row = candidateToRow(c);
      // Dedup at the (work, edition) level: a copy is a duplicate only if this
      // exact edition of this work is already owned or already seen in this batch.
      // Two distinct editions of the same title therefore both survive, and a new
      // edition of an already-owned title is no longer wrongly discarded.
      const { signature } = editionIdentity(row);
      if (existing.has(signature) || seen.has(signature)) {
        duplicates.push({ title: c.title, author: c.author });
        return;
      }
      seen.add(signature);
      rows.push(row);
    });

    let added = 0;
    let importSummary: Awaited<ReturnType<typeof upsertGrouped>> | null = null;
    let reconciled = 0;
    if (rows.length > 0) {
      const grouped = groupRows(rows);
      importSummary = await upsertGrouped(grouped);
      added = rows.length; // copies actually committed (may span fewer works)

      // Retro-match the newly added works against the persisted Goodreads shelf,
      // so a book that is on the shelf but was only just catalogued is marked read
      // immediately. Best-effort: a reconcile failure must not fail the commit.
      try {
        const r = await reconcileReads();
        reconciled = r.matches.length;
      } catch (err) {
        console.error("[intake/commit] reconcile after commit failed:", err);
      }
    }

    if (added > 0) revalidateTag(CATALOGUE_TAG);

    return Response.json({
      added,
      duplicates,
      rejected,
      import: importSummary,
      reconciledReads: reconciled,
    });
  } catch (err) {
    // Surface DB / network failures as clean JSON rather than crashing the
    // connection (which the client would only see as an opaque "Failed to fetch").
    console.error("[intake/commit] failed:", err);
    return Response.json(
      { error: "commit failed", detail: String(err) },
      { status: 500 },
    );
  }
}
