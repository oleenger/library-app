// Codegen: turns the authoritative reference TSVs under data/ into a validated,
// typed JSON blob consumed at runtime by lib/canon/data.ts. Runs on predev /
// prebuild so the emitted JSON is always in sync with the source data, and is
// also committed so a clean checkout works without running the script.
//
// Source of truth:
//   data/all-books.tsv           essentials per movement (Title Author Year Movement Rank + Other Movements)
//   data/movement-influences.tsv influence edges (Source Target Relationship Strength Note)
//   data/reading-paths.tsv       curated reading order per movement (Movement Position Title Author Year Note)
//
// Policy (decided with the owner — see repo history):
//   * Movement names in the TSVs are already normalized to the taxonomy spelling
//     (renamed at the source, NOT aliased at load time).
//   * Any movement name that is not a valid taxonomy movement — the dropped
//     avant-gardes (Dada, Expressionism, Futurism, New Sincerity) and the
//     out-of-vocab secondaries (Baroque, Petrarchism, …) — is simply skipped.
//     A book kept only by such a tag drops out; an edge touching one is excluded.
//   * "None / Pre-movement" is a real bucket (the Foundations page), not a movement.
//   * We never invent taxonomy labels here; the taxonomy is the authority.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { isMovement, PRE_MOVEMENT_KEY } from "../lib/taxonomy";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const BOOKS_TSV = join(ROOT, "data", "all-books.tsv");
const EDGES_TSV = join(ROOT, "data", "movement-influences.tsv");
const PATHS_TSV = join(ROOT, "data", "reading-paths.tsv");
const OUT = join(ROOT, "lib", "canon", "generated", "canon-data.json");

const PRE_MOVEMENT = PRE_MOVEMENT_KEY;

// ---- year parsing ---------------------------------------------------------
// Faithful display string kept as-is; sortYear is a single number (BCE = negative,
// circa dropped, ranges collapsed to their start) used only for ordering/matching.
function parseSortYear(raw: string): number | null {
  const first = raw.split(/[–-]/)[0]; // range → start segment
  const m = first.match(/(\d+)\s*(BCE|CE)?/i);
  if (!m) return null;
  const n = Number(m[1]);
  return /BCE/i.test(m[2] ?? "") ? -n : n;
}

// ---- tsv helpers ----------------------------------------------------------
function rows(path: string): string[][] {
  return readFileSync(path, "utf8")
    .replace(/\r/g, "")
    .split("\n")
    .filter((l) => l.trim().length > 0)
    .slice(1) // drop header
    .map((l) => l.split("\t"));
}

// The "Other Movements" column in this reference export separates multiple
// secondaries with a comma (NOT the pipe used by the Supabase column). No
// taxonomy movement name contains a comma, so this split is unambiguous.
function splitSecondary(cell: string | undefined): string[] {
  if (!cell) return [];
  return cell
    .split(/[,|]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

// ---- types (mirrored in lib/canon/data.ts) --------------------------------
interface Essential {
  title: string;
  author: string;
  sortYear: number | null;
  displayYear: string;
  rank: number | null; // null = arrives via a secondary tag (no curated rank)
}
interface Edge {
  source: string;
  target: string;
  relationship: string;
  strength: string;
  note: string;
}
interface ReadingStep {
  position: number;
  title: string;
  author: string;
  sortYear: number | null;
  displayYear: string;
  note: string;
}

// ---- build essentials -----------------------------------------------------
const dropped = new Map<string, number>();
const note = (name: string) => dropped.set(name, (dropped.get(name) ?? 0) + 1);

const byMovement = new Map<string, Essential[]>();
const preMovement: Essential[] = [];

for (const [title, author, year, primary, rankRaw, otherRaw] of rows(BOOKS_TSV)) {
  const base = {
    title: title.trim(),
    author: (author ?? "").trim(),
    sortYear: parseSortYear(year ?? ""),
    displayYear: (year ?? "").trim(),
  };
  const rank = rankRaw && rankRaw.trim() ? Number(rankRaw.trim()) : null;

  // Pre-movement classics form their own bucket (and still populate movement
  // pages via any valid secondary tag below).
  if (primary === PRE_MOVEMENT) {
    preMovement.push({ ...base, rank: null });
  } else if (isMovement(primary)) {
    (byMovement.get(primary) ?? byMovement.set(primary, []).get(primary)!).push({ ...base, rank });
  } else {
    note(primary);
  }

  // Secondary tags: valid taxonomy movements only, always rank-less.
  for (const sec of splitSecondary(otherRaw)) {
    if (sec === primary) continue; // no double-count when primary repeats
    if (isMovement(sec)) {
      (byMovement.get(sec) ?? byMovement.set(sec, []).get(sec)!).push({ ...base, rank: null });
    } else {
      note(sec);
    }
  }
}

// Order each movement: curated ranks first (asc), then rank-less by year (asc).
function orderEssentials(list: Essential[]): Essential[] {
  return [...list].sort((a, b) => {
    if (a.rank != null && b.rank != null) return a.rank - b.rank;
    if (a.rank != null) return -1;
    if (b.rank != null) return 1;
    return (a.sortYear ?? Infinity) - (b.sortYear ?? Infinity);
  });
}

const movements: Record<
  string,
  { essentials: Essential[]; years: { min: number; max: number } | null }
> = {};
for (const [name, list] of byMovement) {
  const essentials = orderEssentials(list);
  const yrs = essentials.map((e) => e.sortYear).filter((y): y is number => y != null);
  movements[name] = {
    essentials,
    years: yrs.length ? { min: Math.min(...yrs), max: Math.max(...yrs) } : null,
  };
}

// ---- build edges ----------------------------------------------------------
const edges: Edge[] = [];
let droppedEdges = 0;
for (const [source, target, relationship, strength, edgeNote] of rows(EDGES_TSV)) {
  if (!isMovement(source) || !isMovement(target)) {
    droppedEdges++;
    continue;
  }
  edges.push({
    source: source.trim(),
    target: target.trim(),
    relationship: (relationship ?? "").trim(),
    strength: (strength ?? "").trim(),
    note: (edgeNote ?? "").trim(),
  });
}

// ---- build reading paths --------------------------------------------------
// One curated, ordered reading sequence per movement — plus the pre-movement
// foundations path, which is keyed like any other movement. Non-taxonomy
// movements (the dropped avant-gardes) are skipped, so their paths never reach
// the app.
const byPath = new Map<string, ReadingStep[]>();
for (const [movement, posRaw, title, author, year, stepNote] of rows(PATHS_TSV)) {
  if (movement !== PRE_MOVEMENT && !isMovement(movement)) {
    note(movement);
    continue;
  }
  const list = byPath.get(movement) ?? byPath.set(movement, []).get(movement)!;
  list.push({
    position: Number((posRaw ?? "").trim()) || list.length + 1,
    title: (title ?? "").trim(),
    author: (author ?? "").trim(),
    sortYear: parseSortYear(year ?? ""),
    displayYear: (year ?? "").trim(),
    note: (stepNote ?? "").trim(),
  });
}
const readingPaths: Record<string, ReadingStep[]> = {};
for (const [name, list] of byPath) {
  readingPaths[name] = [...list].sort((a, b) => a.position - b.position);
}

// ---- emit -----------------------------------------------------------------
const out = {
  generatedAt: new Date().toISOString(),
  source: "data/all-books.tsv + data/movement-influences.tsv + data/reading-paths.tsv",
  movements,
  preMovement: orderEssentials(preMovement),
  edges,
  readingPaths,
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(out, null, 2) + "\n");

// ---- report ---------------------------------------------------------------
const movementCount = Object.keys(movements).length;
const essentialCount = Object.values(movements).reduce((n, m) => n + m.essentials.length, 0);
const pathCount = Object.keys(readingPaths).length;
const stepCount = Object.values(readingPaths).reduce((n, p) => n + p.length, 0);
console.log(
  `[canon] ${movementCount} movements, ${essentialCount} essential slots, ` +
    `${preMovement.length} pre-movement, ${edges.length} edges (${droppedEdges} edges dropped), ` +
    `${pathCount} reading paths (${stepCount} steps).`,
);
if (dropped.size) {
  const summary = [...dropped.entries()].map(([n, c]) => `${n}×${c}`).join(", ");
  console.log(`[canon] dropped non-taxonomy tags: ${summary}`);
}
