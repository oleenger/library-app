# Feature Proposal — Movement Lineage

Companion to the main project proposal. Specifies one new feature: a navigable map of literary movements that situates the user's collection within the history of literature.

## Summary
A view that, for any movement, shows what it grew out of / reacted against, what it led to, and its contemporaries — each node annotated with how many of the user's books fall under it. Tapping a node re-centres the map on that movement. It turns the flat period/movement taxonomy into a browsable lineage, and doubles as an in-context gap finder (movements the user owns nothing in render as visibly empty).

This is the primary "learning" surface: it teaches literary history while tying every node back to books actually on the shelves.

## Why
The app's differentiator is organising by period and movement. Lineage is the feature that makes that structure *educational* rather than just a filter — it shows how movements relate, not merely that they exist. It relies almost entirely on data already held, so it is high value for low cost.

## Behaviour
- Centre on a movement: show its era, a short context note, the user's holding count, and example titles from the user's own library.
- **Upstream** ("grew out of / reacted against") and **downstream** ("led to") movements shown as tappable chips above and below.
- **Alongside** (contemporaries / sub-movements) shown as a secondary row.
- Every chip shows the user's book count for that movement; movements with zero holdings render faded/dashed — an in-context learning prompt.
- Tapping any chip re-centres the whole view on it.

## Data model
Two inputs:

1. **Movement relationships** — a small, hand-authored static file (the lineage graph). Not derived, not LLM-generated. Shape per movement:
   ```
   {
     "Modernism": {
       "era": "Modernist · 1901–1945",
       "reacted_against": ["Realism", "Symbolism"],
       "led_to": ["Postmodernism"],
       "alongside": ["Stream of consciousness", "Imagism", "Surrealism", "Lost Generation", "Harlem Renaissance"]
     }
   }
   ```
   Curated once, versioned alongside `taxonomy.md`. Every referenced label must exist in the approved taxonomy.

2. **Live library data** — holding counts and example titles come from the user's own works, grouped by `primary_movement` (existing query). No new storage.

## Classification vs. generation
- **Lineage edges:** static relationships file. Reliable, free to run, no model calls. Do **not** generate the graph with the LLM.
- **Context notes:** may be static (authored per movement, stored) or LLM-generated once and cached. Start static; add LLM enrichment later only if wanted. Notes are never regenerated per view.

## Integration
- New surface, reachable from a movement tag anywhere (Book detail, Library filter, Stats) and/or under "For you".
- Reuses existing period/movement colours and the work/edition data. No schema changes required beyond storing the relationships file and (optionally) cached notes.

## Scope
**In:** the lineage graph file; the centred-movement view; upstream/downstream/alongside navigation; per-node holding counts; empty-state (gap) styling; example titles from the library.
**Out (for now):** LLM-generated notes; author-level lineage; a force-directed full-graph visualisation. The banded up/centre/down layout is sufficient and clearer on mobile.

## Acceptance criteria
- Every movement in the taxonomy resolves to a lineage view (even if some relations are empty).
- All chips reflect the user's live holding counts; zero-holding movements are visibly distinct.
- Navigation re-centres correctly and every referenced movement is a valid taxonomy label.
- No per-view model calls (notes are static or cached).

## Effort
Small. The graph file is a one-time authoring task; the view is a read-only render over existing data. No new tables, no import changes. Deliver after the core Library/Insights surfaces, since it depends on the same classification data being in place.

## Reference
Interactive mockup provided separately (`lineage_mockup.html`), centred on Modernism, demonstrating navigation, holding counts, gap styling, and library-linked examples.
