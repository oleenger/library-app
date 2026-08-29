// The extraction prompt: the shelf-to-csv skill's rules (docs/shelf-skill/
// SKILL.md), adapted for the tool-call path and extended with per-book
// confidence (the hybrid design). The controlled vocabulary is injected from
// lib/taxonomy.ts so the prompt can never drift from the enums in schema.ts.

import { MOVEMENTS, PERIODS } from "../taxonomy";

export function buildExtractionPrompt(): string {
  return `You are reading a photograph of a bookshelf to build a library import.

TASK
Identify every book you can actually read in the image from its spine or cover,
and return one entry per book by calling the "extract_books" tool. Do not write
prose; put everything in the tool call.

READING THE SPINES — DO NOT GUESS
- Report only text you can genuinely read. Never invent a title or author, and
  never fill a title from what you'd "expect" to see on a shelf. A confident
  wrong book is worse than a flagged uncertain one — a human reviews every row.
- TRANSCRIBE, DO NOT SUBSTITUTE. Read the exact letters printed on the spine,
  even for unfamiliar or non-English (e.g. Norwegian, Swedish, Icelandic) titles.
  Never "correct" an unfamiliar foreign title into a similar-sounding famous
  book you happen to know. If the spine says "Salme ved reisens slutt", return
  exactly that — not some other Nordic-sounding title.
- AUTHOR vs TITLE: many spines print the AUTHOR'S NAME in the largest lettering
  (often running vertically) and the TITLE smaller or elsewhere. Do not mistake
  one for the other. If the same large name repeats across several adjacent
  spines, it is almost certainly the author — read the smaller text for each
  distinct title.
- "confidence" (0..1) MUST reflect how clearly you could read THIS spine:
  ~0.9+ only when every word of title and author is sharp and unambiguous; ~0.5
  when you are partly reading and partly inferring; below 0.35 when the text is
  rotated, in an unfamiliar script/language you cannot cleanly transcribe, or you
  are mostly inferring. When in doubt, go LOWER.
- If you cannot cleanly transcribe BOTH the title and the author, set
  "unreadable": true and confidence below 0.35. Do not upgrade a guess into a
  certainty, and do not silently drop the book.
- One entry per distinct book actually visible. If the same work appears in two
  bindings, that is two entries.

CLASSIFYING (only once a book is correctly identified)
- After you have read a title/author, you MAY best-guess first_published, period
  and movement from your own knowledge of that work — these are not read from the
  spine and a human confirms them.
- publisher: fill only if legible on the spine and you are >60% sure; else omit.
- period, primary_movement and secondary_movements MUST come from the controlled
  vocabulary below. Do not invent labels. Omit a movement if none fits. Assign
  period by era and movement by style.
- No qualifiers like "(approx)" inside any field. Express uncertainty only via
  the confidence and unreadable fields.

CONTROLLED VOCABULARY
Periods (choose exactly one per book):
${PERIODS.map((p) => `- ${p}`).join("\n")}

Movements (one primary + optional secondary):
${MOVEMENTS.map((m) => `- ${m}`).join("\n")}`;
}
