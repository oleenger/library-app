// Build the text prompt for the recommendation call from the reading history.
// We send only read works (the taste signal), sorted so the strongest signal —
// highly-rated titles — leads, and we cap the list so the prompt stays bounded
// regardless of library size (worst-case token cost is capped by design).

import type { Work } from "../types";
import { MOVEMENTS, PERIODS } from "../taxonomy";

/** Max read works included in the prompt; caps per-call input size. */
const MAX_HISTORY = 120;

interface HistoryLine {
  title: string;
  author: string;
  rating: number | null;
  period: string | null;
  movement: string | null;
}

function toLine(w: Work): HistoryLine {
  return {
    title: w.title,
    author: w.author,
    rating: w.reading?.rating ?? null,
    period: w.classification.period,
    movement: w.classification.primaryMovement,
  };
}

/** Rated works first (highest rating first), then unrated; title as tiebreak. */
function byStrength(a: HistoryLine, b: HistoryLine): number {
  const ra = a.rating ?? -1;
  const rb = b.rating ?? -1;
  if (ra !== rb) return rb - ra;
  return a.title.localeCompare(b.title);
}

export interface RecommendPrompt {
  text: string;
  /** How many read works were actually included (after the cap). */
  basedOn: number;
}

export function buildRecommendPrompt(works: Work[]): RecommendPrompt {
  const history = works
    .filter((w) => w.reading)
    .map(toLine)
    .sort(byStrength)
    .slice(0, MAX_HISTORY);

  // Titles the model must not recommend back: the entire owned library, not just
  // the read subset — recommending a book already on the shelf is useless.
  const owned = works
    .map((w) => `${w.title} — ${w.author}`)
    .sort((a, b) => a.localeCompare(b));

  const historyText = history
    .map((h) => {
      const stars = h.rating != null ? `${h.rating}/5` : "unrated";
      const tags = [h.period, h.movement].filter(Boolean).join(", ");
      return `- "${h.title}" by ${h.author} (${stars})${tags ? ` [${tags}]` : ""}`;
    })
    .join("\n");

  const text = [
    "You are a well-read literary advisor. Recommend books this reader would love,",
    "based strictly on the evidence in their reading history below. Weight",
    "highly-rated titles most; look for the authors, periods, and movements they",
    "return to, and offer a mix of safe hits and one or two adventurous but",
    "defensible picks.",
    "",
    "Hard rules:",
    "- Recommend only real, published books.",
    "- Never recommend a book that appears in the OWNED LIBRARY list (they already have it).",
    "- Every recommendation must cite concrete evidence from the history (name the",
    "  titles/authors/movements that justify it).",
    "- Return 3 to 8 recommendations via the recommend_books tool.",
    "",
    "READING HISTORY (strongest signal first):",
    historyText || "(none)",
    "",
    "OWNED LIBRARY (do not recommend any of these back):",
    owned.join("\n"),
  ].join("\n");

  return { text, basedOn: history.length };
}

// --- Canon gaps ----------------------------------------------------------

export interface CanonPrompt {
  text: string;
  /** Number of owned works the coverage was computed from. */
  basedOn: number;
}

/** Build the canon-gap prompt: library coverage per period/movement + owned list. */
export function buildCanonPrompt(works: Work[]): CanonPrompt {
  const periodCounts = new Map<string, number>();
  const movementCounts = new Map<string, number>();
  for (const w of works) {
    const p = w.classification.period;
    if (p) periodCounts.set(p, (periodCounts.get(p) ?? 0) + 1);
    const m = w.classification.primaryMovement;
    if (m) movementCounts.set(m, (movementCounts.get(m) ?? 0) + 1);
    for (const s of w.classification.secondaryMovements) {
      movementCounts.set(s, (movementCounts.get(s) ?? 0) + 1);
    }
  }

  // Show every taxonomy period/movement with its count (0 = wholly absent), so
  // the model can see gaps directly rather than infer them.
  const periodCoverage = PERIODS.map((p) => `- ${p}: ${periodCounts.get(p) ?? 0}`).join("\n");
  const movementCoverage = MOVEMENTS.map((m) => `- ${m}: ${movementCounts.get(m) ?? 0}`).join("\n");

  // The reader's demonstrated focus: the periods and movements they own most of.
  const topPeriods = [...periodCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 3)
    .map(([p, n]) => `${p} (${n})`);
  const topMovements = [...movementCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 5)
    .map(([m, n]) => `${m} (${n})`);

  const owned = works
    .map((w) => `${w.title} — ${w.author}`)
    .sort((a, b) => a.localeCompare(b));

  const text = [
    "You are a literary curator helping a reader deepen the collection in the",
    "areas they clearly love. Group your recommendations UNDER the reader's focus",
    "areas — the periods and movements they favour — and under each list the major,",
    "canonical works they are still MISSING.",
    "",
    "Method:",
    "- The reader's strongest areas (most owned) are given below; treat these as",
    "  the focus areas. Use the exact period/movement names shown.",
    "- Choose 4-6 focus areas total. Favour the reader's clear interests; you may",
    "  add at most one adjacent area worth developing.",
    "- Under each area, list the foundational works they lack, most important first.",
    "- Score each work 1..10. 10 = an absolute cornerstone of that area no serious",
    "  collection can omit (e.g. Pride and Prejudice for Romanticism, Gravity's",
    "  Rainbow for Postmodernism). 7-9 = major; 4-6 = notable; 1-3 = minor.",
    "- Return ABOUT 30 works in total across all focus areas.",
    "",
    "Hard rules:",
    "- Recommend only real, published books.",
    "- Never recommend a work already in the OWNED LIBRARY list.",
    "",
    `READER'S STRONGEST PERIODS: ${topPeriods.join(", ") || "(none yet)"}`,
    `READER'S STRONGEST MOVEMENTS: ${topMovements.join(", ") || "(none yet)"}`,
    "",
    "PERIOD COVERAGE (owned works per period):",
    periodCoverage,
    "",
    "MOVEMENT COVERAGE (owned works per movement):",
    movementCoverage,
    "",
    "OWNED LIBRARY (do not recommend any of these back):",
    owned.join("\n"),
  ].join("\n");

  return { text, basedOn: works.length };
}
