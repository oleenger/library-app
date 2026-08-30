// Shared normalisation for reconciling Goodreads export rows against library
// works. Kept dependency-free (no SDK / no Supabase) so both the matcher and
// lightweight server loaders can share exactly the same keying rules.

const stripDiacritics = (s: string) =>
  s.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");

export function normTitle(raw: string): string {
  return stripDiacritics(raw.toLowerCase())
    .replace(/\([^)]*\)/g, " ") // drop series / edition parentheticals
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function normAuthor(raw: string): string {
  let s = raw.trim();
  // "Last, First" -> "First Last" (library uses natural order; guard anyway).
  const comma = s.match(/^([^,]+),\s*(.+)$/);
  if (comma) s = `${comma[2]} ${comma[1]}`;
  return stripDiacritics(s.toLowerCase()).replace(/[^a-z0-9]+/g, " ").trim();
}

/** Deterministic exact-match key over normalised author + title. */
export const readKey = (title: string, author: string) =>
  `${normAuthor(author)}\u0000${normTitle(title)}`;
