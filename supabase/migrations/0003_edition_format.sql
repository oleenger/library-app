-- Edition format (print vs electronic).
--
-- An owned copy is either a physical print edition or an electronic one (Kindle
-- today; other e-formats later). Format is a property of the *edition*, not the
-- work — the same work may be owned in both a print and a Kindle edition. It is
-- also part of edition identity in the importer, so committing a Kindle copy of
-- an already-owned print title creates a second, distinct edition rather than
-- collapsing into the print one.
--
-- Values: 'print' (default) | 'ebook'. Kept as free text (not an enum) so a new
-- format can be introduced without a schema migration.

alter table editions add column if not exists format text not null default 'print';
