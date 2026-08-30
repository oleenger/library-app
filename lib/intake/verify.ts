// Post-extraction verification against a real book database (OpenLibrary).
//
// The vision model transcribes spine text; a misread produces a clean-looking
// title that does not exist. This stage checks each extracted candidate against
// OpenLibrary and, when a confident match exists whose canonical title/author
// differs from what was read, proposes a correction. The human still confirms
// every change in the review step — we never overwrite silently here.
//
// Fail-open: any network/parse error marks a candidate "unverified" rather than
// breaking extraction. A book you can't verify is flagged, not lost.

import type { Candidate } from "./schema";

export type VerifyStatus = "verified" | "corrected" | "unverified";

export interface VerifyMatch {
  title: string;
  author: string;
  first_published: number | null;
  /** OpenLibrary work key, e.g. "/works/OL45804W". */
  key: string | null;
}

export interface VerifyInfo {
  status: VerifyStatus;
  /** Canonical record when a confident match was found, else null. */
  match: VerifyMatch | null;
}

const SEARCH_URL = "https://openlibrary.org/search.json";
const PER_REQUEST_TIMEOUT_MS = 5000;
const CONCURRENCY = 5;

// Match thresholds. Title dominates; author guards against a same-title work by
// a different writer. Both must clear their floor for a "strong" match.
const TITLE_FLOOR = 0.72;
const AUTHOR_FLOOR = 0.55;
// Title-only fallback: when the strict title+author lookup finds nothing (often
// because the AUTHOR was misread), a very strong title match alone is enough to
// propose the canonical record — including a corrected author.
const STRONG_TITLE_FLOOR = 0.84;
// Above this on BOTH axes the read text already equals the canonical record, so
// there is nothing to correct — mark "verified" without a suggestion diff.
const EQUAL_THRESHOLD = 0.92;

// --- string similarity ----------------------------------------------------

/** Lowercase, strip diacritics, collapse punctuation/whitespace. */
function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // combining marks
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function levenshtein(a: string, a2: string): number {
  const m = a.length;
  const n = a2.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  let curr = new Array<number>(n + 1);
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === a2[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

/** 0..1 edit-distance ratio on normalized strings. */
function editRatio(a: string, b: string): number {
  const x = normalize(a);
  const y = normalize(b);
  if (!x && !y) return 1;
  if (!x || !y) return 0;
  const dist = levenshtein(x, y);
  return 1 - dist / Math.max(x.length, y.length);
}

/** 0..1 Jaccard over word tokens — order-insensitive (handles "Last, First"). */
function tokenSim(a: string, b: string): number {
  const A = new Set(normalize(a).split(" ").filter(Boolean));
  const B = new Set(normalize(b).split(" ").filter(Boolean));
  if (A.size === 0 && B.size === 0) return 1;
  if (A.size === 0 || B.size === 0) return 0;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter++;
  return inter / (A.size + B.size - inter);
}

/** Best of edit-ratio and token similarity. */
function bestSim(a: string, b: string): number {
  return Math.max(editRatio(a, b), tokenSim(a, b));
}

// --- OpenLibrary lookup ---------------------------------------------------

interface OLDoc {
  title?: string;
  author_name?: string[];
  first_publish_year?: number;
  key?: string;
}

async function searchOpenLibrary(fields: Record<string, string>): Promise<OLDoc[]> {
  const params = new URLSearchParams({
    ...fields,
    limit: "5",
    fields: "title,author_name,first_publish_year,key",
  });
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), PER_REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${SEARCH_URL}?${params.toString()}`, {
      signal: ctrl.signal,
      headers: {
        // OpenLibrary asks callers to identify themselves.
        "User-Agent": "book-app-intake/1.0 (library import verification)",
        Accept: "application/json",
      },
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { docs?: OLDoc[] };
    return Array.isArray(json.docs) ? json.docs : [];
  } catch {
    return []; // fail-open
  } finally {
    clearTimeout(timer);
  }
}

// --- per-candidate verification ------------------------------------------

function scoreDoc(
  readTitle: string,
  readAuthor: string,
  doc: OLDoc,
): { titleScore: number; authorScore: number } {
  const titleScore = doc.title ? bestSim(readTitle, doc.title) : 0;
  const authorScore =
    doc.author_name && doc.author_name.length
      ? Math.max(...doc.author_name.map((a) => bestSim(readAuthor, a)))
      : 0;
  return { titleScore, authorScore };
}

interface Scored {
  doc: OLDoc;
  titleScore: number;
  authorScore: number;
}

/** Best doc clearing both floors, ranked by a title-weighted combined score. */
function pickBest(
  readTitle: string,
  readAuthor: string,
  docs: OLDoc[],
  titleFloor: number,
  authorFloor: number,
): Scored | null {
  let best: Scored | null = null;
  for (const doc of docs) {
    const { titleScore, authorScore } = scoreDoc(readTitle, readAuthor, doc);
    if (titleScore < titleFloor || authorScore < authorFloor) continue;
    const combined = titleScore * 0.7 + authorScore * 0.3;
    const bestCombined = best ? best.titleScore * 0.7 + best.authorScore * 0.3 : -1;
    if (combined > bestCombined) best = { doc, titleScore, authorScore };
  }
  return best;
}

function toInfo(c: Candidate, best: Scored): VerifyInfo {
  const match: VerifyMatch = {
    title: best.doc.title ?? c.title,
    author: (best.doc.author_name && best.doc.author_name[0]) ?? c.author,
    first_published: best.doc.first_publish_year ?? null,
    key: best.doc.key ?? null,
  };
  // If the read text already equals the canonical record, nothing to suggest.
  const alreadyEqual =
    best.titleScore >= EQUAL_THRESHOLD && best.authorScore >= EQUAL_THRESHOLD;
  return { status: alreadyEqual ? "verified" : "corrected", match };
}

export async function verifyCandidate(c: Candidate): Promise<VerifyInfo> {
  // Pass 1: constrain by title AND author — the precise case.
  const strictDocs = await searchOpenLibrary({ title: c.title, author: c.author });
  const strict = pickBest(c.title, c.author, strictDocs, TITLE_FLOOR, AUTHOR_FLOOR);
  if (strict) return toInfo(c, strict);

  // Pass 2: title-only. Catches a misread/absent author when the title is a very
  // strong match — the canonical author is then offered as a correction. Author
  // floor is 0 here precisely because the read author may be wrong.
  const titleDocs = await searchOpenLibrary({ title: c.title });
  const byTitle = pickBest(c.title, c.author, titleDocs, STRONG_TITLE_FLOOR, 0);
  if (byTitle) return toInfo(c, byTitle);

  return { status: "unverified", match: null };
}

/** Run fn over items with a bounded concurrency, preserving order. */
async function mapPool<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

/** Verify a batch of candidates against OpenLibrary. Never throws. */
export function verifyCandidates(candidates: Candidate[]): Promise<VerifyInfo[]> {
  return mapPool(candidates, CONCURRENCY, (c) =>
    verifyCandidate(c).catch(() => ({ status: "unverified" as const, match: null })),
  );
}
