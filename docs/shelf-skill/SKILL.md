---
name: shelf-to-csv
description: Generate a library-import CSV from photos of bookshelves. Identifies books from their spines, assigns literary period and movement from a controlled taxonomy, and best-guesses publisher and first-published year. Use when the user uploads shelf/bookcase images and wants a catalogue or import file.
---

# Shelf to CSV

Turn bookshelf photos into a clean, import-ready CSV of works.

## Output format

One row per distinct **edition** visible in the photos (not per work — the same work in two bindings is two rows, which the importer links by title+author). Columns, in order:

```
title,author,first_published,original_language,edition_language,publisher,edition,period,primary_movement,secondary_movements,notes
```

- **title** — work title. Keep the original language of the edition shown; add an English gloss in parentheses only if helpful.
- **author** — natural order ("First Last"). Multiple authors separated by "; ".
- **first_published** — year of the *work*, not the edition. Always fill; best-guess if unsure (no flags).
- **original_language** — language the work was *written* in (English, Norwegian, Swedish, German, Spanish…).
- **edition_language** — language of the *copy in the photo*. Equals original_language for untranslated books; differs for translations (e.g. a Norwegian translation of a German work). Read from the spine/title shown.
- **publisher** — of the edition in the photo. Fill only when confidence > 60%; otherwise leave blank. Best-guess counts as fill if >60%.
- **edition** — human-readable name of a *shared* edition (omnibus / box set / trilogy volume) when several works are bound together, e.g. "Brontë box set", "The African Trilogy". Leave **blank** for a standalone single-work volume. The importer groups all rows sharing the same edition+publisher into one edition record, so a box set holding 7 works is 7 rows with the *same* edition value.
- **period** — exactly one, from the taxonomy.
- **primary_movement** — one from the taxonomy (or blank if none fits).
- **secondary_movements** — zero or more from the taxonomy, separated by "|" (pipe). This is the delimiter the importer splits on — never use commas or "; " here.
- **notes** — short factual notes only (e.g. "Owned in multiple editions", "Short stories"). Never confidence tags.

## Hard rules

1. **No qualifiers in cells.** Never write "(approx)", "(best guess)", "(unconfirmed)" or similar in the data. The file is for import; qualifiers are noise. Express any uncertainty in the chat reply instead.
2. **Best-guess, don't blank** for title, author, first_published, period, movement. Only publisher may be blank (when ≤60% confident).
3. **One row per distinct edition visible.** Never collapse duplicates of the same work into a single row. If a work appears in several editions across the photos (different publisher/binding/language), emit one row per edition — the importer links them to one work by title+author. Each photo is a snapshot; future photos add editions for the same work. Do not add "Owned in multiple editions" notes and do not guess at copies not pictured.
4. **Taxonomy only.** period/primary_movement/secondary_movements must come from `taxonomy.md`. Do not invent labels; if a needed label is missing, flag it in chat.
5. **UTF-8** output with proper Scandinavian characters (ø, æ, å, é, ë).
6. Assign period = era/time bucket; movement = school/style. A movement may span periods — assign by style, not date.

## Process

1. Read every legible spine across all uploaded images. Note publisher devices/imprints where visible.
2. Emit one row per distinct edition seen. Do not merge repeated works — repeats become multiple rows sharing title+author.
3. For each work assign fields per the rules above, drawing classifications from `taxonomy.md`.
4. Write the CSV with `csv.QUOTE_MINIMAL` and CRLF line endings.
5. In the chat reply (not the file): summarise what was found, and surface the arguable calls — borderline periods, Gothic-vs-Romanticism, low-confidence publishers, deduped duplicates — so the user can review.

## Reference

`taxonomy.md` (bundled) holds the controlled vocabulary of periods and movements. It is a **mirror of the app's `lib/taxonomy.ts`, which is the single source of truth** (the importer rejects any label not in that file). When the two disagree, `lib/taxonomy.ts` wins; regenerate `taxonomy.md` from it rather than hand-editing, so the skill and importer can never drift.
