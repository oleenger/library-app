// Read/write data/read_status.csv — the source of truth for reading history,
// kept separate from the catalogue master so reader data never mixes into the
// bibliographic record. runImport() loads this file into the read_status table.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import Papa from "papaparse";
import { READ_STATUS_COLUMNS, type ReadStatusRow } from "../intake/importer";

const READ_STATUS_PATH = path.join(process.cwd(), "data", "read_status.csv");

/** A read work, keyed by the catalogue work id it was matched to. */
export interface ReadRecord {
  workId: string;
  title: string;
  author: string;
  dateRead: string | null;
  rating: number | null;
  /** How it was matched: "exact" (deterministic) or "llm" (model fallback). */
  source: "exact" | "llm";
}

export function readReadStatus(): ReadRecord[] {
  if (!existsSync(READ_STATUS_PATH)) return [];
  const { data } = Papa.parse<ReadStatusRow>(readFileSync(READ_STATUS_PATH, "utf8"), {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });
  const out: ReadRecord[] = [];
  for (const r of data) {
    const workId = r.work_id?.trim();
    if (!workId) continue;
    const rating = Number(r.rating);
    out.push({
      workId,
      title: r.title ?? "",
      author: r.author ?? "",
      dateRead: r.date_read?.trim() || null,
      rating: Number.isFinite(rating) && rating > 0 ? rating : null,
      source: r.source === "llm" ? "llm" : "exact",
    });
  }
  return out;
}

/**
 * Merge fresh matches into the existing read_status.csv and write it back. New
 * records win on work_id conflict (a re-upload carries the latest date/rating).
 * Returns the merged set so callers can report the total.
 */
export function mergeAndWriteReadStatus(fresh: ReadRecord[]): ReadRecord[] {
  const byId = new Map<string, ReadRecord>();
  for (const r of readReadStatus()) byId.set(r.workId, r);
  for (const r of fresh) byId.set(r.workId, r);

  const merged = [...byId.values()].sort((a, b) =>
    a.author.localeCompare(b.author) || a.title.localeCompare(b.title),
  );

  const matrix = merged.map((r) => [
    r.workId,
    r.title,
    r.author,
    r.dateRead ?? "",
    r.rating != null ? String(r.rating) : "",
    r.source,
  ]);
  const csv = Papa.unparse(
    { fields: [...READ_STATUS_COLUMNS], data: matrix },
    { newline: "\n" },
  );
  writeFileSync(READ_STATUS_PATH, `${csv}\n`, "utf8");
  return merged;
}
