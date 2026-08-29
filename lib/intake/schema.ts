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
