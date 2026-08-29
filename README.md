# Personal Library App

A personal catalogue for browsing a book collection by **literary period and
movement**, tracking what's been read, adding new books by photographing a shelf,
and getting LLM reading recommendations. See the
[project proposal](docs/personal-library-app-project-proposal.md) and the
[delivery plan](library-app-delivery-plan.md).

It is a single-owner app: the whole site is gated to one account, and all data
lives in Supabase (Postgres).

## Features

- **Browse the library** — cover-led grid (text-only "covers"; book images are
  out of scope). Filter by **period** and **movement**; search by title/author.
  Header shows live counts (books, read, authors, year span).
- **Book & edition detail** — a `Work` (the browsed, classified unit) may be
  owned in several `Edition`s; an omnibus edition may hold several works.
- **Photo intake** (`/capture`) — photograph a bookshelf; a vision-capable Claude
  model reads the spines via a strict `extract_books` tool call (Zod-validated),
  best-guesses period/movement from the controlled taxonomy, and flags anything
  it can't read cleanly. Every row is human-reviewed before it's committed.
- **Reading import** (`/reading`) — upload a Goodreads CSV export to mark which
  library titles you've read. Rows match to works deterministically first, with
  an LLM cross-language title-match fallback; results feed reading stats and the
  `/reads` view.
- **Recommendations** (`/recommendations`) — LLM-generated books to read next
  (taste) and the major canonical works your library is missing (canon gaps).
  Generation is an explicit action guarded by a source **fingerprint cache** plus
  a cooldown, so viewing the page never triggers a model call and an unchanged
  library never re-generates.

## Stack

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS ·
**Supabase (Postgres)** for storage and auth · Anthropic SDK for the vision and
recommendation calls · Zod for schema validation · Papa Parse for CSV.

Warm, editorial styling per the proposal's design direction (§12).

## Auth & access model

- **Single owner.** Sign-in is a Supabase magic link, allowed only for the address
  in `OWNER_EMAIL`; any other address is refused. `middleware.ts` refreshes the
  session on every request and redirects anything without the owner's session to
  `/login` (it fails **closed** if `OWNER_EMAIL` is unset).
- **Trusted server path.** All data access runs server-side under the Supabase
  **service-role key** (`lib/supabase/admin.ts`), which bypasses RLS. Because the
  site is already gated to the owner, this keeps queries simple.
- **Defence in depth.** RLS is enabled on every table with **no public policies**,
  so a leaked anon key exposes nothing.

## Data model

Postgres schema in [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql):

- **`works`** — the classified unit. `UNIQUE(title, author)` **enforces
  de-duplication**: two rows with the same title + author are the same work.
- **`editions`** and **`work_editions`** — a many-to-many join (an omnibus holds
  several works; a work may be owned in several editions).
- **`read_status`** — reading history keyed by work; `source` records how the row
  was matched (`exact` or `llm`).
- **`recommendations`** — persisted LLM recommendation sets (`taste`, `canon`),
  each served until its source fingerprint changes.

The Work/`ReadingEvent` grain and the title+author de-dup rule are unchanged from
the original SQLite PoC — the schema was ported straight across (`INSERT OR IGNORE`
→ `INSERT ... ON CONFLICT DO NOTHING`). `db/schema.sql` remains as the PoC
reference.

### Seed data (`data/`)

Local files used to seed Supabase (not the live source of truth once deployed):

| file | contents |
|---|---|
| `library_master.csv` | the catalogue, **one row per owned edition** |
| `read_status.csv` | reading history (work-keyed) |
| `recommendations.json` | a previously generated recommendation set |
| `goodreads.csv` | a raw Goodreads export, for the import flow |

`library_master.csv` columns:

| column | notes |
|---|---|
| `title`, `author` | required. Same title + author = the **same Work** (deduplicated), owned in different editions |
| `first_published` | year the work was first published (optional) |
| `original_language` | the work's original language |
| `edition_language` | language of the owned edition (may be a translation) |
| `publisher` | owned edition's publisher (optional) |
| `edition` | shared edition/omnibus name; blank = a standalone volume |
| `period` | era (one value); must be in the taxonomy |
| `primary_movement` | school/style (one value); must be in the taxonomy |
| `secondary_movements` | zero or more, `\|`-separated; each must be in the taxonomy |
| `notes` | free-text note (optional) |

The seed validates every period/movement against the controlled taxonomy
(`lib/taxonomy.ts`) and rejects anything off-list.

## Configuration

Copy `.env.example` to `.env.local` and fill in real values (restart the dev
server after). On Vercel, set the same keys as Project Environment Variables.

| variable | purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (public) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key, used in the browser auth flow (public) |
| `SUPABASE_SERVICE_ROLE_KEY` | **secret** — server-side privileged data access |
| `OWNER_EMAIL` | the one account allowed to sign in |
| `ANTHROPIC_API_KEY` | **secret** — vision, matching, recommendations (server only) |
| `INTAKE_MODEL` | vision model for photo intake (e.g. `claude-opus-4-8`) |
| `READING_MATCH_MODEL` | optional; model for Goodreads title matching (defaults to a Sonnet) |
| `RECOMMEND_MODEL` | optional; model for recommendations (defaults to Opus) |

Model choice is deliberate: Opus reads hard spines (rotated, non-English) far more
reliably for intake, while the cheaper Sonnet is a good fit for the text-only
reading-match task. Both `READING_MATCH_MODEL` and `RECOMMEND_MODEL` fall back to
`INTAKE_MODEL` and then a sensible default, so the app works with only the required
keys set.

## Run locally

```bash
npm install
npm run dev -- -H 0.0.0.0   # serves on http://<lan-ip>:3000 (phone-accessible)
```

Development must always use port `3000`. If it's occupied, stop the existing
process rather than using Next.js's fallback port.

Production build:

```bash
npm run build && npm run start
```

## Seeding Supabase

Apply the migration in `supabase/migrations/0001_init.sql` to your project (via the
Supabase SQL editor or CLI), then load the local data files:

```bash
npm run seed   # node --env-file=.env.local scripts/seed-supabase.ts
```

Requires `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in
`.env.local`. The seed is **idempotent** — every write uses `ON CONFLICT DO
NOTHING`/upsert, so re-running it after editing the CSVs only adds what's new. It
prints a load summary and exits non-zero if any row is off-taxonomy.

## Adding new books

Once deployed, add books by photographing shelves at `/capture` — the reviewed,
committed candidates are written straight to Supabase. To bulk-load or correct the
catalogue offline, edit `data/library_master.csv` and re-run `npm run seed`.
