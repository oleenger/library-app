# Feature Proposal — Canon Gaps → Reading Paths

Companion to the main project proposal. Specifies an upgrade to the existing **Canon Gaps** feature: add reading-order and narration so a gap list can also be read as an ordered path.

## Summary
Canon Gaps today is an importance-ranked list of major works the user is missing, grouped by area. This adds a second presentation of the same data: an **ordered reading path** through an area, where the user's owned books appear inline as waypoints and missing works are marked as gaps, each step carrying a one-line rationale for its position. A toggle switches between "As a path" (ordered, narrated) and "By importance" (the current ranked list).

This is an **extension of Canon Gaps, not a separate feature.** Both answer "what should I read next?"; keeping them one surface avoids two overlapping features.

## Why one feature, not two
- Gaps and Paths draw on the same data (taxonomy, holdings, canon) and serve the same need. Splitting them produces two half-features competing for the same screen.
- Ordering + narration is an evolution of an existing, shipped surface — lower risk and faster than a new tab.
- Keeps the app focused; a separate Paths tab is more surface area to maintain for a single-user app.
- If richer multi-topic curricula later justify their own space, split then — cheaper to merge now and split later than the reverse.

## Behaviour
- **Toggle** at the top of a Canon Gaps area: *As a path* (default) / *By importance* (current behaviour, unchanged).
- **Path view:** the area's major works in reading order down a vertical spine.
  - **Owned books are waypoints** — shown inline in sequence, marked "In your library", never filtered out. A fully-owned path reads as a tour of the user's own shelves.
  - **Missing works** are marked as gaps, numbered by reading position.
  - Each step has a **rationale line** — why it sits here and what it sets up.
  - A **coverage indicator** ("3 of 8 owned") frames it as progress through a canon.
- **Ordering is pedagogical, not strictly chronological** — an accessible entry point may precede an earlier-but-harder work; the summit is placed last. This is the point of a path over a year-sort.

## Priority (user-ranked)
1. **Canonical paths** (owned + missing) — the primary case; build first.
2. **Routes through owned books** — largely free: a canonical path whose waypoints are all owned already *is* this. No separate build.
3. **Bridges** (from a movement the user reads into an adjacent one they don't) — later, as a mode within the same feature.

## Classification vs. generation
- **Ordering:** rule-based where possible (chronological / difficulty). Cheap, no model calls for the base sequence.
- **Narration (per-step rationale):** LLM-generated **once per path and cached** — never regenerated per view. This is the main model cost and the main quality risk: a bad reading order is worse than none, so paths should be reviewable/regenerable, not silently trusted.
- Path membership is drawn from the canon for that taxonomy area; owned/gap status is a live join against the user's holdings.

## Data model
- Reuses Canon Gaps' existing candidate set (major works per area, with importance score).
- Adds, per path: an ordered sequence and a cached rationale string per step.
- Owned/gap and coverage are derived live from holdings (`title + author` match against the library). No new per-book storage beyond cached path text.

## Integration
- Lives on the existing Canon Gaps surface under "For you". No new tab.
- Reuses period/movement colours, holdings data, and the importance scoring already in place.

## Scope
**In:** the path/ranked toggle; ordered path view with spine; owned-as-waypoint behaviour; per-step rationale (cached); coverage indicator; regenerate action.
**Out (for now):** bridges mode; multi-area combined curricula; non-cached/live regeneration on every view.

## Acceptance criteria
- Any Canon Gaps area can render as an ordered path and as the current ranked list, from the same data.
- Owned books appear inline as waypoints in path view, clearly distinct from gaps, and are never omitted.
- Coverage count matches live holdings.
- Rationale and ordering are generated once and cached; no per-view model calls.
- A path can be regenerated on demand.

## Effort
Small–medium. The ranked list already exists; the additions are an ordering pass, a cached rationale per step, and the path UI. Model usage is bounded (once per path, cached). Deliver after the core classification data and Canon Gaps are in place.

## Reference
Interactive mockup provided separately (`reading_path_mockup.html`): a Modernism path with the path/importance toggle, owned waypoints, gap steps, per-step rationale, and coverage bar.
