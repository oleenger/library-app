// Match Goodreads "read" entries to existing library works. Two tiers:
//
//   Tier 1 (deterministic, free): normalise title + author and exact-match. Catches
//   every same-language title that appears identically in both sources.
//
//   Tier 2 (LLM, residual only): the library stores many titles in Norwegian /
//   reading-language while the export carries the original or English edition
//   ("Søvngjengerne I: Pasenow eller romantikken" vs "Pasenow oder die Romantik").
//   For library works still unmatched, ask Claude to reconcile them against the
//   still-unmatched export rows — blocked by author, so the call stays tiny. Matches
//   are written automatically (no human confirm step, per the chosen design).
//
// New works are NEVER created here: an export row that matches nothing is dropped.

import Anthropic from "@anthropic-ai/sdk";
import { readFileSync } from "node:fs";
import path from "node:path";
import Papa from "papaparse";
import { getReadingMatchEnv } from "../env";
import { workIdFor } from "../intake/importer";
import type { ReadRecord } from "./store";
import { parseGoodreadsReads, type GoodreadsRead } from "./goodreads";

interface LibraryWork {
  workId: string;
  title: string;
  author: string;
  year: number | null;
}

export interface MatchResult {
  matches: ReadRecord[];
  totalReads: number;
  tier1: number;
  tier2: number;
  unmatchedLibrary: number;
  unmatchedGoodreads: number;
  llmUsed: boolean;
  llmError: string | null;
}

// --- normalisation -------------------------------------------------------

const stripDiacritics = (s: string) =>
  s.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");

function normTitle(raw: string): string {
  return stripDiacritics(raw.toLowerCase())
    .replace(/\([^)]*\)/g, " ") // drop series / edition parentheticals
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function normAuthor(raw: string): string {
  let s = raw.trim();
  // "Last, First" -> "First Last" (library uses natural order; guard anyway).
  const comma = s.match(/^([^,]+),\s*(.+)$/);
  if (comma) s = `${comma[2]} ${comma[1]}`;
  return stripDiacritics(s.toLowerCase()).replace(/[^a-z0-9]+/g, " ").trim();
}

const key = (title: string, author: string) => `${normAuthor(author)}\u0000${normTitle(title)}`;

// --- library source ------------------------------------------------------

function loadLibraryWorks(): LibraryWork[] {
  const csvPath = path.join(process.cwd(), "data", "library_master.csv");
  const { data } = Papa.parse<{ title?: string; author?: string; first_published?: string }>(
    readFileSync(csvPath, "utf8"),
    { header: true, skipEmptyLines: true, transformHeader: (h) => h.trim() },
  );
  const byId = new Map<string, LibraryWork>();
  for (const r of data) {
    const title = r.title?.trim();
    const author = r.author?.trim();
    if (!title || !author) continue;
    const workId = workIdFor(title, author);
    if (byId.has(workId)) continue; // one row per work (editions collapse)
    const year = Number(r.first_published);
    byId.set(workId, { workId, title, author, year: Number.isFinite(year) ? year : null });
  }
  return [...byId.values()];
}

// --- entry point ---------------------------------------------------------

export async function matchReads(csv: string): Promise<MatchResult> {
  const reads = parseGoodreadsReads(csv);
  const library = loadLibraryWorks();

  const matches: ReadRecord[] = [];
  const matchedWorkIds = new Set<string>();
  const consumed = new Set<number>(); // indices into `reads`

  // Tier 1: exact normalised match.
  const libByKey = new Map<string, LibraryWork>();
  for (const w of library) {
    const k = key(w.title, w.author);
    if (!libByKey.has(k)) libByKey.set(k, w);
  }
  reads.forEach((r, i) => {
    const w = libByKey.get(key(r.title, r.author));
    if (!w || matchedWorkIds.has(w.workId)) return;
    matchedWorkIds.add(w.workId);
    consumed.add(i);
    matches.push(record(w, r, "exact"));
  });
  const tier1 = matches.length;

  // Tier 2: LLM reconciliation of the residual, blocked by author.
  const unmatchedLib = library.filter((w) => !matchedWorkIds.has(w.workId));
  const unmatchedReads = reads
    .map((r, i) => ({ r, i }))
    .filter(({ i }) => !consumed.has(i));

  let tier2 = 0;
  let llmUsed = false;
  let llmError: string | null = null;

  const libAuthors = new Set(unmatchedLib.map((w) => normAuthor(w.author)));
  const candidateReads = unmatchedReads.filter(({ r }) => libAuthors.has(normAuthor(r.author)));
  const readAuthors = new Set(candidateReads.map(({ r }) => normAuthor(r.author)));
  const candidateLib = unmatchedLib.filter((w) => readAuthors.has(normAuthor(w.author)));

  if (candidateLib.length > 0 && candidateReads.length > 0) {
    const env = getReadingMatchEnv();
    if (!env.ok) {
      llmError = `LLM matching skipped — missing ${env.missing.join(", ")}`;
    } else {
      try {
        const pairs = await llmMatch(env.env, candidateLib, candidateReads);
        for (const { libraryId, goodreadsIndex } of pairs) {
          const w = candidateLib.find((x) => x.workId === libraryId);
          const read = reads[goodreadsIndex];
          if (!w || !read || matchedWorkIds.has(w.workId) || consumed.has(goodreadsIndex)) {
            continue;
          }
          matchedWorkIds.add(w.workId);
          consumed.add(goodreadsIndex);
          matches.push(record(w, read, "llm"));
          tier2++;
        }
        llmUsed = true;
      } catch (err) {
        llmError = `LLM matching failed: ${String(err)}`;
      }
    }
  }

  return {
    matches,
    totalReads: reads.length,
    tier1,
    tier2,
    unmatchedLibrary: library.length - matchedWorkIds.size,
    unmatchedGoodreads: reads.length - consumed.size,
    llmUsed,
    llmError,
  };
}

function record(w: LibraryWork, r: GoodreadsRead, source: "exact" | "llm"): ReadRecord {
  return {
    workId: w.workId,
    title: w.title,
    author: w.author,
    dateRead: r.dateRead,
    rating: r.rating,
    source,
  };
}

// --- LLM tier ------------------------------------------------------------

const MATCH_TOOL: Anthropic.Tool = {
  name: "report_matches",
  description:
    "Report which library works are the SAME work as an export row, ignoring " +
    "language, translation and edition. Only pair items by the same author.",
  input_schema: {
    type: "object",
    properties: {
      pairs: {
        type: "array",
        items: {
          type: "object",
          properties: {
            library_id: { type: "string", description: "id from the library list" },
            goodreads_index: { type: "integer", description: "index from the export list" },
          },
          required: ["library_id", "goodreads_index"],
        },
      },
    },
    required: ["pairs"],
  },
};

async function llmMatch(
  env: { apiKey: string; model: string },
  lib: LibraryWork[],
  reads: { r: GoodreadsRead; i: number }[],
): Promise<{ libraryId: string; goodreadsIndex: number }[]> {
  const client = new Anthropic({ apiKey: env.apiKey });

  const libLines = lib
    .map((w) => `  id=${w.workId} | ${w.title} | ${w.author}${w.year ? ` | ${w.year}` : ""}`)
    .join("\n");
  const readLines = reads
    .map(({ r, i }) => `  index=${i} | ${r.title} | ${r.author}${r.year ? ` | ${r.year}` : ""}`)
    .join("\n");

  const prompt = `You reconcile a personal library against a Goodreads "read" export.
The library often stores a work under its Norwegian/translated title while the
export lists the original-language or English edition of the SAME work. Your job:
find, for each LIBRARY item, the export row that is the same underlying work.

RULES
- Match only items by the SAME author.
- A match means the same literary work, regardless of language, translation, or
  edition. Example: "Søvngjengerne I: Pasenow eller romantikken" = "Pasenow oder
  die Romantik" (Hermann Broch).
- Do NOT pair two different works by an author just because nothing else matches.
  If a library item has no true counterpart in the export, leave it out.
- Each library id and each export index may appear at most once.
- Return results only via the report_matches tool.

LIBRARY (unmatched):
${libLines}

EXPORT — Goodreads "read" (unmatched):
${readLines}`;

  const msg = await client.messages.create({
    model: env.model,
    max_tokens: 4096,
    tools: [MATCH_TOOL],
    tool_choice: { type: "tool", name: "report_matches" },
    messages: [{ role: "user", content: [{ type: "text", text: prompt }] }],
  });

  const toolUse = msg.content.find((c) => c.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") return [];
  const input = toolUse.input as { pairs?: { library_id?: string; goodreads_index?: number }[] };
  return (input.pairs ?? [])
    .filter((p): p is { library_id: string; goodreads_index: number } =>
      typeof p.library_id === "string" && Number.isInteger(p.goodreads_index),
    )
    .map((p) => ({ libraryId: p.library_id, goodreadsIndex: p.goodreads_index }));
}
