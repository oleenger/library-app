"use client";

import { useEffect } from "react";

// PWA Stage 4 — runtime niceties for the installed app.
//  - Request persistent storage so the offline catalogue mirror and cover
//    cache are not evicted under memory pressure (most valuable once installed).
//  - Reflect the display mode on <html> (data-display-mode) so CSS/components
//    can adapt to the standalone window vs. an ordinary browser tab.
export function PwaRuntime() {
  useEffect(() => {
    // Persistent storage: ask once; the browser may grant silently when the
    // app is installed. Failure is harmless.
    if (navigator.storage?.persist) {
      navigator.storage.persisted().then((already) => {
        if (!already) void navigator.storage.persist().catch(() => {});
      });
    }

    // Display-mode reflection, kept in sync if it changes at runtime.
    const mql = window.matchMedia("(display-mode: standalone)");
    const apply = () => {
      document.documentElement.dataset.displayMode = mql.matches
        ? "standalone"
        : "browser";
    };
    apply();
    mql.addEventListener("change", apply);
    return () => mql.removeEventListener("change", apply);
  }, []);

  return null;
}
