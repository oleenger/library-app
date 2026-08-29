"use client";

import { useEffect, useState } from "react";

// PWA Stage 2 — manual service-worker registration with an update toast.
// We register manually (rather than letting @serwist/next auto-register) so we
// control the update flow: when a new worker finishes installing it parks in
// `waiting`; we surface a toast, and only skip-waiting when the user asks. The
// `controllerchange` listener reloads once the new worker takes control.
export function ServiceWorkerRegister() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });

    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        if (reg.waiting && navigator.serviceWorker.controller) {
          setWaiting(reg.waiting);
        }
        reg.addEventListener("updatefound", () => {
          const next = reg.installing;
          if (!next) return;
          next.addEventListener("statechange", () => {
            if (next.state === "installed" && navigator.serviceWorker.controller) {
              setWaiting(next);
            }
          });
        });
      })
      .catch(() => {
        // Registration failing must never break the app; offline is a bonus.
      });
  }, []);

  if (!waiting) return null;

  function update() {
    waiting?.postMessage({ type: "SKIP_WAITING" });
    setWaiting(null);
  }

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]"
      role="status"
      aria-live="polite"
    >
      <div className="mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-paper-edge bg-ink p-3 pl-4 shadow-card">
        <p className="min-w-0 flex-1 text-sm font-medium text-canvas">
          A new version is available.
        </p>
        <button
          type="button"
          onClick={update}
          className="shrink-0 rounded-lg bg-accent px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-accent/90"
        >
          Reload
        </button>
      </div>
    </div>
  );
}
