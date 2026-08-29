// URL slugs for collection pages (authors, periods, movements).
//
// Taxonomy values contain characters that are hostile to path segments —
// spaces, and crucially "/" (e.g. "Classical / Antiquity", "Aestheticism /
// Decadence"). Rather than percent-encode (a "%2F" path segment is decoded
// inconsistently by Next.js routing), we derive a stable, lossy slug and match
// it back against the catalogue at request time. Collisions are theoretically
// possible but do not occur in the fixed vocabulary.

/**
 * Normalise a display value to a URL-safe slug: strip diacritics, lowercase,
 * and collapse any run of non-alphanumeric characters to a single hyphen.
 *   "Gabriel García Márquez" → "gabriel-garcia-marquez"
 *   "Classical / Antiquity"  → "classical-antiquity"
 */
export function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // drop combining diacritics
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
