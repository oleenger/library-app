// Build the text prompt for the recommendation call from the reading history.
// We send only read works (the taste signal), sorted so the strongest signal —
// highly-rated titles — leads, and we cap the list so the prompt stays bounded
// regardless of library size (worst-case token cost is capped by design).
//
// The owned library is NOT dumped into the taste prompt: it crowds out the taste
// signal and LLMs dedup-by-list unreliably anyway. Overlap with the shelf is
// removed in code after the call (see generate.ts). We keep the reader's taste
// in three buckets — loved, disliked, recent — so the model has both positive
// and negative signal plus a sense of where their taste is heading.

import type { Work } from "../types";
import { MOVEMENTS, PERIODS } from "../taxonomy";

/** Max read works included in the prompt; caps per-call input size. */
const MAX_HISTORY = 120;
/** Ratings at or below this count as negative signal (things to steer away from). */
const DISLIKE_MAX = 2;
/** How many most-recent reads to surface as a "where taste is heading" signal. */
const RECENT_COUNT = 12;

/** Shared literary-advisor persona; sent as the system prompt for both kinds. */
export const RECOMMEND_SYSTEM = [
  "You are a sharp, well-read literary advisor with wide-ranging taste across",
  "periods, languages, and movements. You know the canon cold, but you also know",
  "the underread gems, the translations worth chasing, and the unexpected pairing",
  "that makes a reader say 'how did you know'. You are confident and specific, not",
  "cautious. A recommendation that is merely safe and obvious is a failure; a",
  "recommendation that is surprising yet clearly right for this reader is the goal.",
].join("\n");

interface HistoryLine {
  title: string;
  author: string;
  rating: number | null;
  period: string | null;
  movement: string | null;
  dateRead: string | null;
}

function toLine(w: Work): HistoryLine {
  return {
    title: w.title,
    author: w.author,
    rating: w.reading?.rating ?? null,
    period: w.classification.period,
    movement: w.classification.primaryMovement,
    dateRead: w.reading?.dateRead ?? null,
  };
}

/** Rated works first (highest rating first), then unrated; title as tiebreak. */
function byStrength(a: HistoryLine, b: HistoryLine): number {
  const ra = a.rating ?? -1;
  const rb = b.rating ?? -1;
  if (ra !== rb) return rb - ra;
  return a.title.localeCompare(b.title);
}

/** Most recently read first; entries without a date sort last. */
function byRecency(a: HistoryLine, b: HistoryLine): number {
  const da = a.dateRead ?? "";
  const db = b.dateRead ?? "";
  if (da !== db) return db.localeCompare(da);
  return a.title.localeCompare(b.title);
}

function formatLine(h: HistoryLine): string {
  const stars = h.rating != null ? `${h.rating}/5` : "unrated";
  const tags = [h.period, h.movement].filter(Boolean).join(", ");
  return `- "${h.title}" by ${h.author} (${stars})${tags ? ` [${tags}]` : ""}`;
}

export interface RecommendPrompt {
  /** System persona for the call. */
  system: string;
  /** User-turn text: the reader's taste evidence + task. */
  text: string;
  /** How many read works were actually included (after the cap). */
  basedOn: number;
}

export function buildRecommendPrompt(works: Work[]): RecommendPrompt {
  const read = works.filter((w) => w.reading).map(toLine);

  // Positive signal: loved/liked works, strongest first, capped.
  const loved = read
    .filter((h) => h.rating == null || h.rating > DISLIKE_MAX)
    .sort(byStrength)
    .slice(0, MAX_HISTORY);

  // Negative signal: works the reader actively disliked. Small but valuable —
  // it lets the model steer away from a direction, not just toward one.
  const disliked = read
    .filter((h) => h.rating != null && h.rating <= DISLIKE_MAX)
    .sort(byStrength);

  // Trajectory signal: what they've been reading lately (dated reads only).
  const recent = read
    .filter((h) => h.dateRead)
    .sort(byRecency)
    .slice(0, RECENT_COUNT);

  const lovedText = loved.map(formatLine).join("\n");
  const dislikedText = disliked.map(formatLine).join("\n");
  const recentText = recent.map(formatLine).join("\n");

  const text = [
    "Recommend books this reader would love, drawing on the taste evidence below.",
    "Read the whole picture — the authors, periods, and movements they return to,",
    "what they rate highly, what they abandoned or disliked, and where their taste",
    "has been heading lately — then use your own broad knowledge to make picks that",
    "are genuinely exciting, not just adjacent. Aim for a mix: a few confident hits",
    "and one or two bolder, non-obvious picks you can defend.",
    "",
    "Guidance:",
    "- Recommend only real, published books.",
    "- Do NOT recommend books the reader has already read (listed below). Anything",
    "  already on their shelf is removed automatically, so favour breadth over",
    "  hedging — don't waste a slot on something they likely own.",
    "- Prefer the underread, the in-translation, and the surprising-but-right over",
    "  the obvious bestseller they've certainly already heard of.",
    "- Give each pick a short, vivid reason that connects it to their taste; be",
    "  specific, but you may reason beyond the literal history when the leap is sound.",
    "- Return 3 to 8 recommendations via the recommend_books tool, best first.",
    "",
    "LOVED / LIKED (strongest signal first):",
    lovedText || "(none yet)",
    "",
    "DISLIKED (steer away from what these have in common):",
    dislikedText || "(none recorded)",
    "",
    "READING LATELY (where their taste is heading):",
    recentText || "(no dated reads)",
  ].join("\n");

  return { system: RECOMMEND_SYSTEM, text, basedOn: loved.length };
}

// --- Canon gaps ----------------------------------------------------------

export interface CanonPrompt {
  /** System persona for the call. */
  system: string;
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
    "As a literary curator, map out the foundational canon of the areas this",
    "reader clearly loves, so it can be read either as a ranked list of gaps or",
    "as an ordered reading path. Group your works UNDER the reader's focus areas —",
    "the periods and movements they favour — and under each lay out that area's",
    "cornerstone works IN READING ORDER.",
    "",
    "Method:",
    "- The reader's strongest areas (most owned) are given below; treat these as",
    "  the focus areas. Use the exact period/movement names shown.",
    "- Choose 4-6 focus areas total. Favour the reader's clear interests; you may",
    "  add at most one adjacent area worth developing.",
    "- Under each area, list its cornerstone works — INCLUDING the ones the reader",
    "  already owns (marked in the OWNED LIBRARY list below). Owned works are",
    "  waypoints in the path, not omissions: a reader following the path passes",
    "  through books they already have. Do NOT skip an owned cornerstone.",
    "- Give every work both an `importance` (1..10) and a reading `order`.",
    "  - importance: 10 = an absolute cornerstone no serious collection can omit",
    "    (Pride and Prejudice for Romanticism, Gravity's Rainbow for Postmodernism);",
    "    7-9 = major; 4-6 = notable; 1-3 = minor.",
    "  - order: number the works within each area 1, 2, 3 … in the sequence you'd",
    "    have the reader take them. Order is PEDAGOGICAL, not strictly chronological:",
    "    an accessible entry point may precede an earlier-but-harder work, and the",
    "    hardest summit belongs last. This ordering is the whole point of a path.",
    "- Give each work a one-line `reason` that justifies its POSITION — why it sits",
    "  here and what it sets up for what follows — not just a description.",
    "- Return ABOUT 30 works in total across all focus areas.",
    "",
    "Hard rules:",
    "- Recommend only real, published books.",
    "- Include owned cornerstones as waypoints; do not treat the OWNED LIBRARY list",
    "  as an exclusion list. It is there so you can weave the reader's own books",
    "  into the path in the right places.",
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
    "OWNED LIBRARY (weave these in as waypoints where they belong):",
    owned.join("\n"),
  ].join("\n");

  return { system: RECOMMEND_SYSTEM, text, basedOn: works.length };
}
