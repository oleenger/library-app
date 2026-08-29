// Parse a Goodreads CSV export into the read entries we care about. Only the
// "read" shelf is kept; editions, ISBNs, reviews and the rest are ignored — the
// question is only "which titles have been read", per the tracking scope.

import Papa from "papaparse";

export interface GoodreadsRead {
  title: string;
  author: string;
  /** Original publication year, when the export has one. */
  year: number | null;
  /** ISO yyyy-mm-dd, or null when the export left Date Read blank. */
  dateRead: string | null;
  /** 1..5, or null when unrated (Goodreads stores 0 for "no rating"). */
  rating: number | null;
}

interface GoodreadsRow {
  Title?: string;
  Author?: string;
  "Original Publication Year"?: string;
  "Date Read"?: string;
  "My Rating"?: string;
  "Exclusive Shelf"?: string;
}

function toIsoDate(raw: string | undefined): string | null {
  const v = raw?.trim();
  if (!v) return null;
  // Goodreads writes yyyy/mm/dd.
  const m = v.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (!m) return v;
  const [, y, mo, d] = m;
  return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

/** Parse the export text; return every book on the "read" shelf. */
export function parseGoodreadsReads(csv: string): GoodreadsRead[] {
  const { data } = Papa.parse<GoodreadsRow>(csv, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  const out: GoodreadsRead[] = [];
  for (const r of data) {
    if (r["Exclusive Shelf"]?.trim() !== "read") continue;
    const title = r.Title?.trim();
    const author = r.Author?.trim();
    if (!title || !author) continue;

    const year = Number(r["Original Publication Year"]);
    const rating = Number(r["My Rating"]);
    out.push({
      title,
      author: author.replace(/\s+/g, " "),
      year: Number.isFinite(year) ? year : null,
      dateRead: toIsoDate(r["Date Read"]),
      rating: Number.isFinite(rating) && rating > 0 ? rating : null,
    });
  }
  return out;
}
