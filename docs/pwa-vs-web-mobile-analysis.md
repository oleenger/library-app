# PWA vs. Plain Web Page on Mobile

## Analysis and suggestions for the Personal Library app

**Status:** Analysis and recommendation
**Context:** The application will be a **Progressive Web App (PWA)**, not a native Android/iOS app (see project proposal §13). This document explains what that decision means in practice, how the installed PWA will behave differently from simply opening the same site in a mobile browser, and concrete suggestions for making the mobile experience feel deliberate rather than like a shrunk-down desktop page.

---

## 1. The core distinction

There are three things people loosely call "the app":

| Form | What it is | How it is reached |
|---|---|---|
| **Responsive web page** | The site opened in Chrome on the phone | A URL / bookmark |
| **Installed PWA** | The *same* codebase, added to the home screen and run in a standalone window | Home-screen icon |
| **Native app** | A separately built Android/iOS binary | App store |

This project deliberately uses the first two and rejects the third. The important insight is that the PWA and the responsive web page are **the same code** — the difference in behaviour comes from *install context*, *service worker state*, and a handful of deliberate design decisions, not from a separate build.

The goal of this document: make sure the installed, mobile experience is not merely "the website, but fullscreen." It should feel like a purpose-built library that happens to be delivered over the web.

---

## 2. What actually changes when the PWA is installed

### 2.1 Chrome/browser behaviour

| Aspect | Plain web page | Installed PWA |
|---|---|---|
| **Chrome UI** | URL bar, tabs and browser chrome always visible | Runs standalone; no URL bar, own window and task-switcher entry |
| **Launch** | Type URL / open bookmark / find a tab | Single tap on a home-screen icon |
| **Vertical space** | ~15% lost to browser chrome | Full screen for content and covers |
| **Persistence** | A tab that can be evicted or lost | A durable app-like surface |
| **Cold start** | Network fetch of shell every time | Service worker serves the shell instantly |
| **Offline** | "No internet" dinosaur | App shell + cached catalogue still load |
| **App switcher** | Appears as a Chrome tab | Appears as its own app with its own icon |
| **Storage durability** | Eviction more likely under pressure | Eligible for persistent storage (see §4) |

### 2.2 Capabilities that become meaningful

- **Service worker caching** — the shell and the synchronised catalogue are cached, so cold starts are instant and offline browsing works (proposal §10). On a plain tab this is technically the same SW, but the value is only felt once launched standalone.
- **Camera / barcode scanning** — works in both, but a standalone window is a far better host for a full-screen scanner (no browser chrome intercepting gestures, cleaner permission story).
- **Home-screen presence** — a first-class icon changes usage patterns: the user opens it like an app, not like "that website."
- **Display mode awareness** — the app can detect `display-mode: standalone` and adapt (see §5).

---

## 3. How the mobile PWA should *behave differently* from the web page

The proposal already asks for responsive layouts (§12). Responsiveness is necessary but not sufficient. Below are the behavioural differences worth building in specifically for the installed, mobile case.

### 3.1 Navigation model

- **Web / desktop:** top navigation or a sidebar for Library / Reading record / Add.
- **Mobile PWA:** a **bottom tab bar** (Library · Reading · Scan · Search). Thumb-reachable, native-feeling, and it keeps the primary axes one tap apart. This is the single highest-impact mobile difference.
- Use `env(safe-area-inset-bottom)` so the bar clears the gesture/home indicator.

### 3.2 The Scan action is a mobile-first primary action

- On mobile the camera exists, so **Scan** should be a prominent, always-available action (e.g. a centre item in the bottom bar or a floating action button).
- On desktop, where there is usually no useful camera, Scan is demoted to manual ISBN entry.
- This is a genuine behavioural fork, not just a layout change: the phone is the intake device; the laptop is the reading/curation device.

### 3.3 Layout density and the cover grid

- **Web/desktop:** multi-column cover grid, hover states, denser filter controls.
- **Mobile:** 2–3 column cover grid, no hover (touch), larger tap targets (≥44px per §12), filters collapsed behind a sheet/drawer rather than always on screen.
- Covers are the dominant visual element (§12); on mobile give them more relative space since there is less chrome competing.

### 3.4 Filtering and search interaction

- **Web:** persistent filter rail alongside results.
- **Mobile:** a bottom **filter sheet** that slides up, applies, and dismisses — keeps the grid full-width while browsing.
- Because the full lightweight catalogue is available locally (§10), search/filter should run against the local (IndexedDB/Dexie) copy and feel instant even offline.

### 3.5 Offline signalling

- The interface must clearly indicate when an action needs a connection (§10, §15). On mobile this matters more because connectivity is intermittent.
- Suggestion: a small, non-intrusive offline banner, plus disabled/greyed online-only actions (Scan metadata lookup, LLM classification) with a short explanation rather than a silent failure.

### 3.6 Gestures and momentum

- Standalone mode has no browser back button. Provide **in-app back affordances** on every detail view and make the Android hardware/gesture back behave correctly (history handling in the router).
- Pull-to-refresh should trigger a catalogue sync rather than a page reload.

---

## 4. Storage and offline durability

- Request **persistent storage** (`navigator.storage.persist()`) after install so the cached catalogue and covers are not evicted under memory pressure. This is much more valuable in the installed context.
- Keep the offline catalogue lightweight (metadata only) as the proposal notes (§10); let cover images use ordinary HTTP cache and degrade gracefully.
- Editing offline is out of scope for v1 (§10) — so the offline mode is **read/browse only**. Make that explicit in the UI rather than letting edit controls appear tappable offline.

---

## 5. Implementation notes (aligned with the chosen stack)

The proposal already selects **Serwist** (service worker) and **Dexie/IndexedDB** (§9). To realise the differences above:

1. **Web app manifest**
   - `display: "standalone"`, a maskable icon set, `theme_color`/`background_color` in the warm paper palette (§12), portrait-primary orientation, and a sensible `start_url` (the Library).
   - Add manifest **shortcuts** for "Scan a book" and "Reading record" so long-press on the icon offers them.

2. **Install prompt**
   - Capture `beforeinstallprompt` and offer a quiet, dismissible "Add to home screen" affordance rather than relying on the browser's default. Single-user app: one gentle nudge is enough.

3. **Display-mode adaptation**
   - Branch on `matchMedia('(display-mode: standalone)')` to enable the bottom tab bar, hide any "open in browser" hints, and adjust safe-area padding.

4. **Serwist caching strategy**
   - App shell: precache (stale-while-revalidate on updates).
   - Catalogue data: network-first with cache fallback, backed by the Dexie mirror.
   - Covers: cache-first with a capped, expiring cache.

5. **Safe areas & viewport**
   - `viewport-fit=cover` plus `env(safe-area-inset-*)` throughout, so the standalone window respects notches and the gesture bar.

6. **Update UX**
   - When the service worker has a new version, show a small "Update available — reload" toast rather than silently swapping mid-session.

---

## 6. Honest limitations of not going native

Worth recording so expectations are set (all acceptable for a single-user library):

- **iOS is weaker for PWAs** — but the stated primary device is Android, so this is low-impact. On Android Chrome the installed experience is strong.
- **No app-store presence** — irrelevant for a private one-user app; install is via "Add to home screen."
- **Background sync / push** — limited and not needed here; sync happens on open/pull-to-refresh.
- **Camera** — the Barcode Detection API (with `@zxing/browser` fallback, §5.2) is sufficient for ISBN scanning; native barcode SDK quality is not required at this volume.

None of these block the product goals. The PWA route keeps the architecture "small and understandable" (§2) while still giving a home-screen, offline-capable, camera-enabled mobile experience.

---

## 7. Summary of recommendations

1. Treat the installed mobile PWA as a **distinct interaction target**, not just a narrow breakpoint.
2. **Bottom tab bar** on mobile; top/side nav on desktop.
3. Make **Scan** a primary mobile action; demote it to manual entry on desktop.
4. **Filter sheet** + full-width cover grid on mobile; persistent filter rail on desktop.
5. Run search/filter against the **local catalogue** for instant, offline-capable results.
6. Request **persistent storage** and signal offline state and online-only actions clearly.
7. Ship a proper **manifest** (standalone, maskable icons, shortcuts) and a quiet install prompt.
8. Handle **standalone navigation** (in-app back, update toast, safe areas) so it doesn't feel like a tab.
