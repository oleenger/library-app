# Plan: Make book-app multi-user

**Decisions locked in:** fully private per-user libraries · Google OAuth only · invite/allowlist signup.

## Where we are today

The app is already on **Supabase (Postgres) + Supabase Auth**, so this is an evolution rather than a rewrite. Three structural blockers are baked into the current single-owner design:

1. **No ownership column** anywhere. Tables (`works`, `editions`, `work_editions`, `read_status`, `recommendations`, `goodreads_reads`) have no `user_id`.
2. **RLS is enabled but empty, and all data access uses the service-role key** (`lib/supabase/admin.ts:19`), which *bypasses RLS entirely*. Adding policies enforces nothing until the app stops using `admin()` for user data.
3. **Auth is pinned to one `OWNER_EMAIL`** (`lib/supabase/middleware.ts:74-79`) and currently disabled (`AUTH_ENABLED !== "true"`).

One non-obvious trap: the catalogue is cached with a **single global tag** (`CATALOGUE_TAG`, `revalidate:false` in `lib/books.ts`). Left as-is, User A would be served User B's cached library. The cache must become per-user.

Critical ID detail: work IDs are **deterministic** — `workIdFor()` returns `${slugify(author)}--${slugify(title)}` (`lib/intake/importer.ts:70-71`), and edition IDs derive from it. Two users adding the same book would generate an **identical primary key** and collide. This drives the schema decision below.

The work splits into 6 tracks. Order matters — schema/RLS must land before the data-access refactor, or you'll lock yourself out.

## 1. Authentication — swap magic-link for Google + allowlist

- **Enable Google provider** in the Supabase dashboard (OAuth client ID/secret from Google Cloud console; add `…/auth/v1/callback` redirect).
- Rewrite `app/login/page.tsx` to call `supabase.auth.signInWithOAuth({ provider: "google" })` instead of `signInWithOtp`. Drop the email form.
- **Allowlist enforcement** — two layers:
  - DB: new `allowed_emails` table + a Supabase **"before user created" Auth Hook** (Postgres function) that rejects sign-ups whose email isn't on the list. This is the hard gate.
  - App: `app/auth/callback` double-checks membership and signs out + redirects with an error if not allowed (defence in depth, friendlier UX).
- **`profiles` table**: `id uuid PK references auth.users(id)`, populated by an `on auth.users insert` trigger. Holds role/display fields; also the anchor for "who is the original owner" during backfill.
- **Rewrite `lib/supabase/middleware.ts`**: delete the single-`OWNER_EMAIL` gate. New rule: any authenticated user may pass; unauthenticated → `/login`. Remove the `AUTH_ENABLED` escape hatch (or keep only for local dev). Retire `OWNER_EMAIL`.

## 2. Schema + RLS (`supabase/migrations/0004_multi_user.sql`)

Add `user_id uuid not null references auth.users(id) on delete cascade` to **all six tables**: `works`, `editions`, `work_editions`, `read_status`, `recommendations`, `goodreads_reads`.

**ID collision fix (recommended approach — least churn):** namespace the generated IDs so they stay globally unique, keeping single-column text PKs and all existing FK wiring intact.

- Change `workIdFor` / `editionIdFor` (`lib/intake/importer.ts`) to prefix with a short per-user token (derived from `auth.uid()`), e.g. `u<8hex>--dostoevsky--crime-and-punishment`.
- FKs (`work_editions.work_id`, `read_status.work_id`) need no structural change.
- *Alternative* (cleaner but bigger refactor of URLs/joins): surrogate UUID PKs + `unique(user_id, title, author)`. Recommend the namespacing approach unless you want the fuller cleanup.

**Key/constraint changes:**

- `works`: replace `unique(title, author)` → `unique(user_id, title, author)`.
- `recommendations`: PK `kind` → `(user_id, kind)`; keep the `kind in ('taste','canon')` check.
- `goodreads_reads`: PK `(title, author)` → `(user_id, title, author)`.

**RLS policies** (the whole point — replace the empty lock-down): for every table, add policies for `select/insert/update/delete` where `user_id = auth.uid()`. Now a leaked anon key or a mis-scoped query exposes nothing cross-user, enforced by Postgres.

## 3. Data-access refactor — stop using the service-role client for user data

This is the largest code change. Today everything reads/writes through `admin()` (`lib/supabase/admin.ts`), which **bypasses RLS** — so RLS would be dead weight until this changes.

- **New per-request client** `lib/supabase/rls.ts`: a session-scoped server client (cookie-based, `@supabase/ssr`) that runs as the logged-in user so RLS applies and `auth.uid()` is populated. Use `server.ts`'s pattern (already exists for auth).
- **Reads** — `lib/books.ts`: `queryCatalogue()` and the four public getters switch from `admin()` to the RLS client. Rows auto-filter to the current user; drop most manual `.eq("user_id", …)` since RLS handles it, but set `user_id` on inserts.
- **Writes** — `lib/catalogue/edit.ts` (6 `admin()` call sites) + all API route handlers under `app/api/**`: switch to the RLS client and stamp `user_id` on insert. The merge/twin logic in `edit.ts` already scopes by identity; it'll now also be RLS-scoped.
- **Keep `admin()` only** for genuinely privileged server tasks: seed/backfill scripts and, if needed, the AI-intake write path (though intake should ideally run as the user too, so it lands in *their* library).

## 4. Per-user caching (correctness bug if skipped)

`lib/books.ts` caches the whole catalogue under one global tag `CATALOGUE_TAG` with `revalidate:false`. In multi-user this would serve one user's library to another.

- Make the `unstable_cache` **key + tag per-user** (include `user_id`), and update `revalidateTag` calls (in the API routes and `lib/actions/refresh.ts`) to invalidate the current user's tag only.
- Audit the React `cache()` / `loadCatalogue()` memoization to confirm it's per-request (it is), and that no module-level singleton leaks data across requests — note `admin()` is a module singleton; the new RLS client must **not** be (create per request).

## 5. Migrate existing data to the owner

- One-time script (`scripts/backfill-user-id.ts`, run with service role): set `user_id` on all existing rows to the owner's `auth.users.id`, and rewrite existing work/edition IDs to the new namespaced form (updating `work_editions` + `read_status` FKs in the same transaction).
- Verify against `data/goodreads.csv` per AGENTS.md read-status sync rule.

## 6. Housekeeping

- `lib/supabase/types.ts` (hand-written `Database` type): add `user_id` to every table's Row/Insert/Update. Consider switching to `supabase gen types` to avoid drift.
- `.env.example`: remove `OWNER_EMAIL` / `AUTH_ENABLED`; document Google OAuth setup.
- Remove now-misleading "single-owner" comments in `admin.ts`, `0001_init.sql`, `middleware.ts`.
- Retire the legacy SQLite PoC (`db/`, `data/library.db`) if still unused.

## Suggested rollout order

1. Migration `0004` (add `user_id` nullable first, backfill, then set `not null` + RLS + policies).
2. ID-namespacing in `importer.ts` + backfill script.
3. Per-request RLS client + switch `books.ts` / `edit.ts` / API routes off `admin()`.
4. Per-user cache tags.
5. Google OAuth + allowlist + middleware rewrite.
6. Delete owner-only cruft, update types/env/docs.

## Risks / call-outs

- **Order-of-operations lockout**: enabling RLS policies *before* the data layer stops using `admin()` will silently keep working (service role bypasses RLS) and hide bugs; switch the client and test with a real non-service session early.
- **AI intake ownership**: decide whether photo-intake/recommendations run as the user (lands in their library — preferred) or via service role (must manually stamp `user_id`).
- **URL IDs**: namespaced IDs appear in `/book/[id]` etc. Harmless (RLS blocks cross-user), but IDs change during backfill — fine for a PoC, would break external bookmarks if any exist.
