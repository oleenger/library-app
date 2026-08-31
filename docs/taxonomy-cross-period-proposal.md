# Taxonomy change proposal — Cross-period modes

Status: **proposed for approval.** Implemented in code (`lib/taxonomy.ts`) per the agreed direction; this doc records the rationale and asks for sign-off / adjustment.

## Problem
`MOVEMENT_PERIODS` assigned **every** movement exactly one period. For period-bound movements (Imagism → Modernist) that is correct. For movements defined by *stance or subject rather than an era*, it produces false labels: the lineage node for **Satire** showed "Renaissance" even though the held Satire works span 1936–2021 (Čapek, Dürrenmatt, Ellis, Cohen, Houellebecq). A single period for a perennial mode is actively misleading.

## Change
Introduce **cross-period modes**: movements whose `MOVEMENT_PERIODS` value is `null`. Views render them as **"Cross-period form"** (neutral colour) instead of a period.

Classified as cross-period (no home era):
- **Satire** — Aristophanes → Swift → Heller
- **Science fiction** — Shelley → Wells → Le Guin
- **Dystopian fiction** — Zamyatin → Orwell → Atwood
- **Crime fiction** — Poe → Christie → present

Kept **origin-anchored** (a period-born form later revived; home era retained):
- **Epic poetry** → Classical / Antiquity
- **Tragedy** → Classical / Antiquity
- **Medieval romance** → Medieval

All other movements are unchanged.

## Why this split
The four cross-period modes are defined by *what they do* (ridicule, speculate, warn, investigate), not when they arose, and their canon is spread evenly across the timeline. Epic, Tragedy, and Medieval romance are forms with a dominant era of origin whose canon still clusters there, so an origin label reads as history, not error.

This line is a judgement call. If you'd rather also treat Epic poetry and Tragedy as cross-period (both do recur — Milton, Walcott; modern tragedy), say so and I'll move them.

## Surface impact
- **Lineage node** (`/lineage/[slug]`): era label shows "Cross-period form" for the four modes.
- **Lineage map** (`/lineage`): a trailing **"Cross-period forms"** band collects them instead of scattering them into wrong eras.
- **Reading paths / colours**: cross-period movements colour neutrally (`periodColor(null)`).
- No CSV or classification data changes — this is label/relationship metadata only.

## Related cleanup (done in the same pass)
- Removed **National Romanticism** and **Neo-Romanticism** from `docs/library-taxonomy.md`. They were never in the code's `MOVEMENTS` list (doc↔code drift) and the taxonomy is meant to stay international, not Norwegian-specific.
- Added the **Genre & cross-period forms** section to the taxonomy doc (Epic poetry, Tragedy, Medieval romance, Satire, Science fiction, Dystopian fiction, Crime fiction) — these existed in code but were absent from the doc.

## To approve / adjust
- Confirm the four cross-period modes (or add Epic/Tragedy).
- Confirm the doc removals (National/Neo-Romanticism).
