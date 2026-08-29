/// <reference lib="webworker" />
/// <reference types="@serwist/next/typings" />

// PWA Stage 2 — offline app shell.
// Serwist precaches the built app shell (__SW_MANIFEST is injected at build)
// and applies runtime caching. skipWaiting is deliberately OFF: a waiting
// worker stays parked so the UI can surface an "Update available" toast and
// activate it on the user's command (see ServiceWorkerRegister).

import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { CacheFirst, ExpirationPlugin, Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: false,
  clientsClaim: true,
  navigationPreload: true,
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
    ...defaultCache,
  ],
});

// Let the page activate a parked update on demand (drives the update toast).
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

serwist.addEventListeners();
