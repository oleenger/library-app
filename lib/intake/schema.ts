// The extraction contract: one Anthropic tool ("extract_books") whose output is
// validated with a mirrored Zod schema before it leaves the server (proposal
// §9.3, §6.3). Period/movement enums are derived from lib/taxonomy.ts — the
// single source of truth — so the model can only return in-vocabulary labels.

import { z } from "zod";
import { MOVEMENTS, PERIODS } from "../taxonomy";

// --- Anthropic tool schema (JSON Schema) ---------------------------------

export const EXTRACT_BOOKS_TOOL = {
  name: "extract_books",
  description:
    "Return one entry per distinguishable book visible in the image, read from " +
    "its spine or cover. Never invent a book that is not visible.",
  input_schema: {
    type: "object" as const,
    properties: {
      books: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: { type: "string", description: "Work title as shown on the spine." },
            author: { type: "string", description: 'Natural order "First Last"; multiple authors joined with "; ".' },
            first_published: { type: "integer", description: "Best-guess year the work was first published." },
            original_language: { type: "string", description: "Language the work was written in." },
            edition_language: { type: "string", description: "Language of the physical copy in the photo." },
            publisher: { type: "string", description: "Publisher of the edition, only if legible / >60% sure." },
            edition: { type: "string", description: 'Shared edition name for an omnibus/box set (e.g. "Brontë box set"); blank for standalone volumes.' },
            period: { type: "string", enum: [...PERIODS], description: "Exactly one literary period." },
            primary_movement: { type: "string", enum: [...MOVEMENTS], description: "One primary movement, or omit if none fits." },
            secondary_movements: { type: "array", items: { type: "string", enum: [...MOVEMENTS] }, description: "Zero or more secondary movements." },
            confidence: { type: "number", description: "0..1 confidence this book was identified correctly." },
            unreadable: { type: "boolean", description: "True if the spine is partially obscured / only partly legible." },
            notes: { type: "string", description: "Short factual note only (e.g. 'Short stories'). Never a confidence tag." },
          },
          required: ["title", "author", "confidence"],
        },
      },
    },
    required: ["books"],
  },
} as const;

// --- Zod mirror (validated before persistence) ---------------------------

export const CandidateSchema = z.object({
  title: z.string().min(1),
  author: z.string().min(1),
  first_published: z.number().int().nullish(),
  original_language: z.string().nullish(),
  edition_language: z.string().nullish(),
  publisher: z.string().nullish(),
  edition: z.string().nullish(),
  period: z.enum(PERIODS).nullish(),
  primary_movement: z.enum(MOVEMENTS).nullish(),
  secondary_movements: z.array(z.enum(MOVEMENTS)).nullish(),
  confidence: z.number().min(0).max(1),
  unreadable: z.boolean().nullish(),
  notes: z.string().nullish(),
});

export const ExtractionSchema = z.object({
  books: z.array(CandidateSchema),
});

export type Candidate = z.infer<typeof CandidateSchema>;

// --- resilient extraction parse ------------------------------------------
//
// The vision model occasionally returns a single off-vocabulary label (a period
// or movement not exactly in the taxonomy) or a malformed number. A strict
// whole-object parse would then reject the ENTIRE photo, losing every legible
// book. Instead we sanitise per book: required identity fields (title, author,
// confidence) must be present, but any invalid OPTIONAL field is coerced to null
// / dropped so the reviewer can fill it in rather than losing the whole shot.

function asString(v: unknown): string | null {
  if (typeof v === "string") {
    const t = v.trim();
    return t ? t : null;
  }
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return null;
}

function asYear(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return Math.trunc(v);
  if (typeof v === "string") {
    const m = v.match(/-?\d{1,4}/);
    if (m) {
      const n = Number(m[0]);
      if (Number.isFinite(n)) return n;
    }
  }
  return null;
}

export interface ParsedExtraction {
  candidates: Candidate[];
  /** Human-readable notes about fields that were coerced or books dropped. */
  dropped: string[];
}

/**
 * Best-effort parse of the model's tool output. Throws only when the top-level
 * shape is unusable (no `books` array). Otherwise always returns whatever books
 * are salvageable, recording any per-field coercions in `dropped`.
 */
export function parseExtraction(input: unknown): ParsedExtraction {
  const books = (input as { books?: unknown })?.books;
  if (!Array.isArray(books)) {
    throw new Error("tool output missing a `books` array");
  }

  const candidates: Candidate[] = [];
  const dropped: string[] = [];

  books.forEach((raw, i) => {
    const b = (raw ?? {}) as Record<string, unknown>;
    const title = asString(b.title);
    const author = asString(b.author);
    if (!title || !author) {
      dropped.push(`book ${i}: missing title/author — skipped`);
      return;
    }

    const rawConf = typeof b.confidence === "number" ? b.confidence : Number(b.confidence);
    const confidence = Number.isFinite(rawConf) ? Math.min(1, Math.max(0, rawConf)) : 0.5;

    const rawPeriod = asString(b.period);
    const period = rawPeriod && (PERIODS as readonly string[]).includes(rawPeriod)
      ? (rawPeriod as (typeof PERIODS)[number])
      : null;
    if (rawPeriod && !period) dropped.push(`"${title}": off-taxonomy period "${rawPeriod}" cleared`);

    const rawPrimary = asString(b.primary_movement);
    const primary = rawPrimary && (MOVEMENTS as readonly string[]).includes(rawPrimary)
      ? (rawPrimary as (typeof MOVEMENTS)[number])
      : null;
    if (rawPrimary && !primary) dropped.push(`"${title}": off-taxonomy movement "${rawPrimary}" cleared`);

    const secondary = Array.isArray(b.secondary_movements)
      ? b.secondary_movements
          .map((m) => asString(m))
          .filter((m): m is (typeof MOVEMENTS)[number] =>
            !!m && (MOVEMENTS as readonly string[]).includes(m))
      : [];

    candidates.push({
      title,
      author,
      first_published: asYear(b.first_published),
      original_language: asString(b.original_language),
      edition_language: asString(b.edition_language),
      publisher: asString(b.publisher),
      edition: asString(b.edition),
      period,
      primary_movement: primary,
      secondary_movements: secondary,
      confidence,
      unreadable: typeof b.unreadable === "boolean" ? b.unreadable : null,
      notes: asString(b.notes),
    });
  });

  return { candidates, dropped };
}
