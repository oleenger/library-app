# PWA Implementation Plan

Companion to `pwa-vs-web-mobile-analysis.md`. The analysis argues PWA is the correct **end state** but should be **additive and delivered last**, once the core app is stable. This plan breaks that work into four small, independently shippable stages — **one git branch per stage** — each of which is safe to merge on its own and leaves the app in a working state.

**Guiding principle:** the PWA layer is added *on top of* the existing responsive web app. Nothing here changes the domain model or existing pages; each stage only adds capability. Cheapest, highest-value work first; the fiddly offline-data work last.

**Chosen tooling** (from proposal §9): Serwist (service worker), Dexie/IndexedDB (offline catalogue). Existing stack: Next.js 15 App Router, React 19, Tailwind, TypeScript.

---

## Stage 1 — Installable shell  (`pwa-1-installable`)

**Goal:** the app can be added to the Android home screen and launches in its own standalone window. No offline yet.

Scope:
- `app/manifest.ts` (Next.js metadata route) — name, short name, `display: standalone`, `start_url`, warm-paper `theme_color`/`background_color`, `orientation`, categories.
- Maskable + any-purpose PNG icons (192, 512) plus the existing `icon.svg`, generated from the current book glyph.
- Manifest **shortcuts** for "Capture books" and "Reading record".
- `viewport-fit=cover` + `env(safe-area-inset-*)` groundwork so the standalone window respects the notch/gesture bar.
- A quiet, dismissible **install prompt** component (`beforeinstallprompt`), shown once, easy to ignore.

Excluded: service worker, offline, caching.

**Exit check:** Chrome on Android offers "Install app"; launched from the home screen it runs full-screen with no URL bar; shortcuts appear on long-press.

---

## Stage 2 — Offline app shell  (`pwa-2-offline-shell`)

**Goal:** the app shell loads instantly and works with no network; the UI no longer shows the browser offline error.

Scope:
- Add **Serwist**: `app/sw.ts` service worker + build wiring in `next.config.ts`.
- Precache the app shell (HTML/JS/CSS) with stale-while-revalidate on updates.
- Runtime caching strategies:
  - Catalogue API responses — network-first, cache fallback.
  - Cover images — cache-first, capped + expiring.
- **Update toast**: when a new service worker is waiting, show a small "Update available — reload" affordance instead of swapping silently.
- Register the service worker only in production/standalone to keep dev debugging clean.

Excluded: local catalogue database, offline search.

**Exit check:** load the app online once, go offline, relaunch — the shell and last-seen pages render; a deployed update surfaces the reload toast.

---

## Stage 3 — Offline catalogue  (`pwa-3-offline-catalogue`)

**Goal:** browse, search and filter the full catalogue offline against a local mirror.

Scope:
- Add **Dexie**; define a lightweight local schema (works + editions + reading-event summaries — metadata only, no heavy blobs).
- Sync: on load / pull-to-refresh, mirror the server catalogue into IndexedDB.
- Point Library and Reading search/filter at the local mirror so results are instant and work offline (proposal §10).
- Graceful cover fallback offline (ordinary HTTP cache; missing covers degrade, per §10).

Excluded: offline **editing** (explicitly out of scope, proposal §10) — offline is read/browse only.

**Exit check:** with the network off, the full ~3,000-book catalogue is browsable, searchable and filterable; covers degrade gracefully.

---

## Stage 4 — Offline UX polish  (`pwa-4-offline-ux`)

**Goal:** make offline state legible and the installed experience feel deliberate.

Scope:
- Request **persistent storage** (`navigator.storage.persist()`) after install so the mirror/cover cache resist eviction.
- **Offline banner** + disable/annotate online-only actions (capture upload, LLM extraction) with a short explanation instead of silent failure.
- **Display-mode adaptation** (`matchMedia('(display-mode: standalone)')`): standalone-only affordances, hide "open in browser" hints, finalise safe-area padding.
- Sanity pass on mobile nav for the installed window (in-app back on detail views, pull-to-refresh → catalogue sync).

**Exit check:** offline state is always clearly indicated; online-only actions never fail silently; installed window respects safe areas and in-app navigation.

---

## Stage summary

| Stage | Branch | Outcome | Cost |
|---|---|---|---|
| 1 | `pwa-1-installable` | Home-screen install, standalone window | Low |
| 2 | `pwa-2-offline-shell` | Instant, offline-capable app shell | Medium |
| 3 | `pwa-3-offline-catalogue` | Full catalogue browsable/searchable offline | Medium–High |
| 4 | `pwa-4-offline-ux` | Legible offline state, polished install | Low–Medium |

## Notes

- Each branch is independently mergeable; stopping after any stage leaves a working app.
- Stages 1–2 deliver most of the perceived "app-like" value; 3 is the real offline payoff; 4 is refinement.
- No stage touches the domain model, auth, or the existing intake/classification work.
