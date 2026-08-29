# Personal Library App — Stage 0 (PoC)

Proof of concept for the [Personal Library App](docs/personal-library-app-project-proposal.md).
This stage answers the one motivating question from the
[delivery plan](library-app-delivery-plan.md): **does browsing a collection by
literary period and movement feel good?**

## What's in scope (Stage 0)

- A flat catalogue of ~78 books loaded from a CSV (`data/books.csv`).
- Cover-led grid (text-only "covers" — book images are deliberately out of scope).
- Filter by **period** and **movement**; search by **title/author**.
- Warm, editorial styling per the proposal's design direction (§12).

Deliberately excluded (arrive in later stages): auth, barcode scanning, LLM
classification, the full work/edition/copy model, reading record, and editing.

## Design note: kept on the real data model's grain

Although this is a throwaway-feeling PoC, the domain types (`lib/types.ts`) keep a
`Work` (the browsed, classified unit) separable from a `ReadingEvent`, so Stage 1
(the MVP) can grow into the full model without a rewrite — "simple, not throwaway".

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS · **local SQLite** (`node:sqlite`,
no native module). `data/books.csv` is the editable source; `npm run import` loads
it into `data/library.db`, which the app reads server-side. Chosen for a local-only
project; the schema (`db/schema.sql`) is plain standard SQL that **ports to
Postgres/Supabase** with no changes if the project ever moves to the cloud.

## Data model

- **`data/books.csv`** — the editable source, **one row per owned edition**.
- **`db/schema.sql`** — `works`, `editions`, and a `work_editions` join table
  (many-to-many: an omnibus holds several works; a work may be owned in several
  editions). `UNIQUE(title, author)` on `works` **enforces de-duplication**.
- **`scripts/import.ts`** — the standalone load script (proposal §5.1): parses the
  CSV, validates every period/movement against the taxonomy (rejecting anything
  off-list), and inserts, printing a load summary.

CSV columns:

| column | notes |
|---|---|
| `title`, `author` | required. Rows with the same title + author are the **same Work** (deduplicated), owned in different editions |
| `first_published` | year the work was first published (optional) |
| `original_language` | the work's original language |
| `edition_language` | language of the owned edition (may be a translation) |
| `publisher` | owned edition's publisher (optional) |
| `edition` | shared edition/omnibus name; blank = a standalone volume |
| `period` | era (one value); must be in the taxonomy |
| `primary_movement` | school/style (one value); must be in the taxonomy |
| `secondary_movements` | zero or more, `\|`-separated; each must be in the taxonomy |
| `notes` | free-text note (optional) |

To record a work you own twice, add two rows with the same title/author and their
differing `publisher`/`edition_language`.

## Run locally

```bash
npm install
npm run dev      # regenerates data/library.db, then serves http://localhost:3000
```

`npm run import` rebuilds the database from the CSV on its own; `dev` and `build`
run it automatically first. Production build:

```bash
npm run build && npm run start
```
