-- Library schema — Postgres (Supabase).
--
-- Ported from db/schema.sql (the SQLite PoC). Work/edition identity and the
-- title+author de-duplication rule are unchanged; only types and the write
-- idiom differ (INSERT OR IGNORE -> INSERT ... ON CONFLICT DO NOTHING).
--
-- Access model: this is a single-owner app. All reads and writes happen
-- server-side under the service-role key (which bypasses RLS). RLS is enabled
-- with NO public policies so that a leaked anon key exposes nothing — defence
-- in depth on top of the owner-only middleware gate (proposal §11).

create table if not exists works (
  id                  text primary key,
  title               text not null,
  author              text not null,
  first_published     integer,
  original_language   text,
  period              text,
  primary_movement    text,
  secondary_movements text,          -- '|'-delimited (mirrors the PoC shape)
  notes               text,
  unique (title, author)             -- enforces work de-duplication at the DB level
);

create table if not exists editions (
  id        text primary key,
  name      text not null,
  publisher text,
  language  text
);

-- Many-to-many: an edition may hold several works (an omnibus), and a work may
-- be owned in several editions.
create table if not exists work_editions (
  work_id    text not null references works (id) on delete cascade,
  edition_id text not null references editions (id) on delete cascade,
  primary key (work_id, edition_id)
);

-- Reading history, keyed by work. `source` records how the row was matched to a
-- library work ("exact" for the deterministic pass, "llm" for the model fallback).
create table if not exists read_status (
  work_id   text primary key references works (id) on delete cascade,
  title     text,
  author    text,
  date_read text,       -- ISO yyyy-mm-dd, or NULL when the export had no date
  rating    integer,    -- 1..5, or NULL when unrated
  source    text
);

-- Persisted LLM recommendation sets (was data/recommendations.json). Two kinds
-- share the table: 'taste' (books to read next) and 'canon' (canonical gaps).
-- A set is served until its source fingerprint changes, so a redeploy or cold
-- start never re-triggers an LLM call.
create table if not exists recommendations (
  kind         text primary key check (kind in ('taste', 'canon')),
  fingerprint  text not null,
  generated_at timestamptz not null,
  model        text not null,
  based_on     integer not null,
  items        jsonb not null
);

-- Lock everything down. Service-role (server) bypasses RLS; anon/authenticated
-- get no policy, hence no access.
alter table works           enable row level security;
alter table editions        enable row level security;
alter table work_editions   enable row level security;
alter table read_status     enable row level security;
alter table recommendations enable row level security;
