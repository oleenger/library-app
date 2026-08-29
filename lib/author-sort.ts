// Derive a "Last, First" sort key from an author's natural-order name, so the
// library can order by last name. The rule is deliberately simple — take the
// last whitespace-separated token as the surname and move it to the front — and
// mirrors the SQL backfill in migration 0002. It gets common Western names right
// ("Fyodor Dostoevsky" -> "Dostoevsky, Fyodor") and leaves single-token names
// untouched ("Homer" -> "Homer"). Names it cannot get right (particles like
// "Le Guin", non-Western order) are meant to be corrected per-work in the edit
// form, which is why author_sort is a stored, editable column rather than
// computed at read time.

export function deriveAuthorSort(author: string): string {
  const name = author.trim().replace(/\s+/g, " ");
  if (!name) return "";
  const lastSpace = name.lastIndexOf(" ");
  if (lastSpace === -1) return name; // single token
  const surname = name.slice(lastSpace + 1);
  const rest = name.slice(0, lastSpace);
  return `${surname}, ${rest}`;
}
