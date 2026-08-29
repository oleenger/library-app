// Build the text prompt for the recommendation call from the reading history.
// We send only read works (the taste signal), sorted so the strongest signal —
// highly-rated titles — leads, and we cap the list so the prompt stays bounded
// regardless of library size (worst-case token cost is capped by design).

import type { Work } from "../types";

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
