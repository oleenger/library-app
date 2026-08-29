# Personal Library App — Phased Delivery Plan

Companion to the project proposal. Structured to start with a small PoC, reach a genuinely usable MVP early, and defer the expensive or fiddly work until the foundation is proven.

**Principle:** each stage is independently useful and de-risks the next. The PoC tests the *idea*; the MVP tests *real data at scale*; scanning and LLM come only once the core is worth it.

---

## Stage 0 — PoC: does browsing by period/movement feel good?

**Goal:** prove the one motivating question before building anything real.

Scope:
- Load a few hundred books from a CSV into a single flat table.
- Library grid with covers.
- Filter by period and movement; basic title/author search.
- Deploy so it can be used on the phone.

Deliberately excluded: auth, scanning, LLM, the work/edition/copy model, reading record, editing.

**Exit check:** browsing the collection by period/movement is satisfying. If not, stop or rethink — nothing else matters yet.

> Build on the real data model's *grain* (keep "work" separable from "reading event") even though most of the model is skipped, so the MVP doesn't need a rewrite. Simple, not throwaway.

---

## Stage 1 — MVP: my actual library, usable daily

**Goal:** turn the PoC into the complete personal catalogue the user could live on for months.

Scope:
- One-time standalone CSV load of all ~3,000 books, validated against the controlled taxonomy.
- Three core views: Library, Reading record, Book detail.
- Search, sort and filter.
- Inline editing of user-controlled fields, especially period and movement.
- Minimal auth (restrict to the owner).

Excluded: barcode scanning, LLM, offline/PWA, automated tests.

**Exit check:** the full collection is loaded, browsable, and editable on phone and laptop. This is a valid stopping point.

---

## Stage 2 — Physical intake: barcode scanning

**Goal:** let new books enter after the migration.

Scope:
- In-browser camera scanning (Barcode Detection API, `@zxing/browser` fallback).
- ISBN metadata lookup (Google Books, then Open Library).
- Match scanned edition to an existing work; confirm before saving.
- Manual entry fallback when scan or lookup fails.

**Exit check:** a newly bought book can be added by scanning in a few taps, without creating duplicate works.

---

## Stage 3 — LLM classification for scanned books

**Goal:** auto-suggest period/movement for the trickle of newly scanned books (which arrive unclassified). Deferred to last because the MVP already handles classification manually and this serves only new additions.

Scope:
- Server-side Anthropic call, strict tool schema, Zod validation.
- Constrained to the approved taxonomy; may return uncertain/not-applicable.
- Store suggestion + final + status; corrections never auto-overwritten.
- Fast review surface for accepting/correcting suggestions.

**Exit check:** scanning an unclassified book produces a reviewable period/movement suggestion that can be accepted or corrected in one action.

---

## Stage 4 — Hardening and production readiness

**Goal:** make it durable.

Scope:
- PWA install + offline browsing of the cached catalogue.
- Data export/backup.
- Automated tests (Vitest, Playwright) and mobile testing.
- RLS, secret handling, provider spend limits, basic operational logging.

**Exit check:** installable, browsable offline, exportable, secured, tested.

---

## Milestone summary

| Stage | Outcome | Independently useful? |
|---|---|---|
| 0 — PoC | Browse a sample by period/movement | Validates the idea |
| 1 — MVP | Full 3,000-book catalogue, editable | Yes — could stop here |
| 2 — Scanning | Add new books by barcode | Yes |
| 3 — LLM | Auto-classify scanned books | Yes |
| 4 — Hardening | PWA, offline, export, tests, security | Production-ready |

## Notes for estimation

- Stages 0 and 1 are the priority; quote them as distinct milestones.
- Stages 2–4 can be quoted separately and scheduled later, or dropped.
- The controlled taxonomy must be finalised before the Stage 1 CSV is finalised, since the load validates against it.
- The work/edition/copy/reading distinction should exist in the schema from Stage 1 even though Stage 0 skips most of it.
