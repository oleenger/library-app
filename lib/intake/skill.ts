// The extraction prompt: the shelf-to-csv skill's rules (docs/shelf-skill/
// SKILL.md), adapted for the tool-call path and extended with per-book
// confidence (the hybrid design). The controlled vocabulary is injected from
// lib/taxonomy.ts so the prompt can never drift from the enums in schema.ts.

import { MOVEMENTS, PERIODS } from "../taxonomy";

export function buildExtractionPrompt(): string {
  return `You are reading a photograph of a bookshelf to build a library import.

TASK
Identify every distinguishable book visible in the image from its spine or cover,
and return one entry per book by calling the "extract_books" tool. Do not write
prose; put everything in the tool call.

RULES
- One entry per distinct book actually visible. Never invent a book that is not
  in the image. If the same work appears in two bindings, that is two entries.
- Never guess a book into existence. If a spine is only partly legible, still
  emit your best reading but set "unreadable": true and a lower "confidence".
- Best-guess title, author and first_published rather than leaving them blank.
- publisher: fill only when you are >60% sure; otherwise omit it.
- period, primary_movement and secondary_movements MUST come from the controlled
  vocabulary below. Do not invent labels. Omit a movement if none fits.
- Assign period by era and movement by style (a movement may span periods).
- "confidence" is 0..1: how sure you are this is the correct book. Be honest;
  low confidence is useful — it is how the reviewer decides what to check.
- No qualifiers like "(approx)" inside any field. Express uncertainty only via
  the confidence and unreadable fields.

CONTROLLED VOCABULARY
Periods (choose exactly one per book):
${PERIODS.map((p) => `- ${p}`).join("\n")}

Movements (one primary + optional secondary):
${MOVEMENTS.map((m) => `- ${m}`).join("\n")}`;
}
