-- Library schema.
--
-- Written to run on BOTH SQLite (the local PoC) and PostgreSQL (Supabase, if
-- adopted later): only standard SQL types (TEXT, INTEGER) and constraints are
-- used. Porting to Postgres needs no schema changes; only the import script's
-- `INSERT OR IGNORE` becomes `INSERT ... ON CONFLICT DO NOTHING`.

CREATE TABLE works (
  id                  TEXT PRIMARY KEY,
  title               TEXT NOT NULL,
  author              TEXT NOT NULL,
  author_sort         TEXT,          -- 'Last, First' sort key; nullable, editable
  first_published     INTEGER,
  original_language   TEXT,
  period              TEXT,
  primary_movement    TEXT,
  secondary_movements TEXT,          -- '|'-delimited; a work_movements table is the Stage 1 shape
  notes               TEXT,
  UNIQUE (title, author)             -- enforces work de-duplication at the DB level
);

CREATE TABLE editions (
  id        TEXT PRIMARY KEY,
  name      TEXT NOT NULL,
  publisher TEXT,
  language  TEXT
);

-- Many-to-many: an edition may hold several works (an omnibus), and a work may be
-- owned in several editions.
CREATE TABLE work_editions (
  work_id    TEXT NOT NULL REFERENCES works (id),
  edition_id TEXT NOT NULL REFERENCES editions (id),
  PRIMARY KEY (work_id, edition_id)
);

-- Reading history, keyed by work (editions are deliberately ignored: "I have read
-- this title" is the unit of interest). Rebuilt from data/read_status.csv on every
-- import so read flags survive a catalogue rebuild, mirroring the CSV-as-source-of-
-- truth rule used for works/editions. `source` records how the row was matched to a
-- library work ("exact" for the deterministic pass, "llm" for the model fallback).
CREATE TABLE read_status (
  work_id   TEXT PRIMARY KEY REFERENCES works (id),
  date_read TEXT,       -- ISO yyyy-mm-dd, or NULL when the export had no date
  rating    INTEGER,    -- 1..5, or NULL when unrated (Goodreads 0)
  source    TEXT        -- 'exact' | 'llm' | 'manual'
);

-- The persisted Goodreads "read" shelf, kept so books added to the library after
-- an export was uploaded can be reconciled without re-uploading the CSV.
CREATE TABLE goodreads_reads (
  title       TEXT NOT NULL,
  author      TEXT NOT NULL,
  year        INTEGER,
  date_read   TEXT,
  rating      INTEGER,
  imported_at TEXT,
  PRIMARY KEY (title, author)
);
