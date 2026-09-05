-- Canonical alias — manual "this owned book IS that canon work" link.
--
-- The reading-path / essentials ownership join matches an owned work to a canon
-- entry by exact title+author, or by a translation-tolerant author-surname+year
-- fallback. That fallback deliberately EXCLUDES a byte-identical surname (so
-- King Lear and an owned Macbeth — same author, same 1606 — are not conflated),
-- which means a same-author translation like Stendhal's "Rødt og sort" can never
-- auto-resolve to the canon "The Red and the Black".
--
-- These columns let the owner assert that link by hand: when set, the owned work
-- ALSO answers to (canonical_title, canonical_author) in every ownership join,
-- so the canon marks it owned/read. Both are set together or both NULL.

alter table works add column if not exists canonical_title  text;
alter table works add column if not exists canonical_author text;
