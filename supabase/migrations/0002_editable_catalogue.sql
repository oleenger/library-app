-- Editable catalogue + Goodreads reconciliation.
--
-- Adds three capabilities on top of 0001_init.sql:
--   1. works.author_sort — a "Last, First" sort key so the library can order by
--      the author's last name. Backfilled from the existing `author` string
--      (last whitespace token first); editable per work for the awkward cases
--      (particles, initials, non-Western name order).
--   2. goodreads_reads — the persisted Goodreads "read" shelf, so books added to
--      the library AFTER an export was uploaded can be reconciled (retro-matched)
--      without re-uploading the CSV.
--   3. read_status rows may now carry source = 'manual' — a read status set by
--      hand in the app, which the Goodreads reconcile pass must never overwrite.

-- 1. author_sort ------------------------------------------------------------
alter table works add column if not exists author_sort text;

-- Backfill: "First Last" -> "Last, First". Single-token names (e.g. "Homer") are
-- kept as-is. This mirrors deriveAuthorSort() in lib/author-sort.ts so app-side
-- writes and this backfill agree.
update works
  set author_sort =
    case
      when position(' ' in btrim(author)) = 0 then btrim(author)
      else regexp_replace(btrim(author), '^(.*)\s+(\S+)$', '\2, \1')
    end
  where author_sort is null;

-- 2. goodreads_reads --------------------------------------------------------
-- The raw "read" shelf from the most recent export. One row per (title, author);
-- a re-upload upserts the latest date/rating. This is the source that reconcile
-- re-matches against the current catalogue.
create table if not exists goodreads_reads (
  title       text not null,
  author      text not null,
  year        integer,
  date_read   text,        -- ISO yyyy-mm-dd, or NULL when the export had no date
  rating      integer,     -- 1..5, or NULL when unrated
  imported_at timestamptz not null default now(),
  primary key (title, author)
);

alter table goodreads_reads enable row level security;
