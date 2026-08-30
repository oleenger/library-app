/// <reference lib="webworker" />
/// <reference types="@serwist/next/typings" />

// PWA Stage 2 — offline app shell.
// Serwist precaches the built app shell (__SW_MANIFEST is injected at build)
// and applies runtime caching. skipWaiting is deliberately OFF: a waiting
// worker stays parked so the UI can surface an "Update available" toast and
// activate it on the user's command (see ServiceWorkerRegister).

import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import {
  CacheFirst,
  ExpirationPlugin,
  Serwist,
  StaleWhileRevalidate,
} from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

// Write / auth routes are never served stale: they must always reflect live
// server state (login redirects, capture, edit forms, import). Everything else
// is read-mostly catalogue browsing where stale-between-refreshes is fine.
const NO_STALE_PREFIXES = [
  "/capture",
  "/reading",
  "/reads/manage",
  "/login",
  "/auth",
];

function isWriteRoute(pathname: string): boolean {
  if (/^\/book\/[^/]+\/edit\/?$/.test(pathname)) return true;
  return NO_STALE_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

// Only cache clean 200s — never a login redirect or an error — so a cached
// navigation can't strand the user on a redirected/opaque response.
const cacheableOnly = {
  cacheWillUpdate: async ({ response }: { response: Response }) =>
    response && response.status === 200 && !response.redirected ? response : null,
};

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: false,
  clientsClaim: true,
  // navigationPreload is a NetworkFirst optimisation; our navigations are now
  // StaleWhileRevalidate, so the preload would be wasted work. Turn it off.
  navigationPreload: false,
  runtimeCaching: [
    // Book covers (typically cross-origin: Google Books / Open Library):
    // cache-first, capped and expiring so the cache cannot grow without bound.
    {
      matcher: ({ request, url }) =>
        request.destination === "image" && url.origin !== self.location.origin,
      handler: new CacheFirst({
        cacheName: "book-covers",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 500,
            maxAgeSeconds: 60 * 60 * 24 * 60, // 60 days
            purgeOnQuotaError: true,
          }),
        ],
      }),
    },
    // Full-page navigations (app launch, hard reloads): serve the last cached
    // HTML instantly, then refresh it in the background. This is what makes the
    // installed app feel fast — it no longer waits on a serverless round-trip.
    {
      matcher: ({ request, url }) =>
        request.mode === "navigate" &&
        url.origin === self.location.origin &&
        !isWriteRoute(url.pathname),
      handler: new StaleWhileRevalidate({
        cacheName: "pages",
        plugins: [
          cacheableOnly,
          new ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 60 * 60 * 24 }),
        ],
      }),
    },
    // RSC payloads for in-app (client router) navigations and prefetches: same
    // stale-while-revalidate treatment so tapping between browse pages is instant.
    {
      matcher: ({ request, url }) =>
        url.origin === self.location.origin &&
        (request.headers.get("RSC") === "1" || url.searchParams.has("_rsc")) &&
        !isWriteRoute(url.pathname),
      handler: new StaleWhileRevalidate({
        cacheName: "pages-rsc",
        plugins: [
          cacheableOnly,
          new ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 60 * 60 * 24 }),
        ],
      }),
    },
    ...defaultCache,
  ],
});

// Let the page activate a parked update on demand (drives the update toast),
// and let pull-to-refresh drop the stale page caches so the following
// router.refresh() re-fetches live content instead of serving a cached copy.
self.addEventListener("message", (event) => {
  const data = event.data;
  if (data && data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
  if (data && data.type === "INVALIDATE_PAGES") {
    event.waitUntil(
      (async () => {
        await Promise.all([
          caches.delete("pages"),
          caches.delete("pages-rsc"),
        ]);
        event.ports[0]?.postMessage({ ok: true });
      })(),
    );
  }
});

serwist.addEventListeners();
