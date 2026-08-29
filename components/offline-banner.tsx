"use client";

import { useOnline } from "@/lib/offline/use-online";

// A quiet, persistent banner shown only while offline. Sits just below the top
// of the viewport so it never fights the bottom install/update toasts, and
// respects the notch via the top safe-area inset.
export function OfflineBanner() {
  const online = useOnline();
  if (online) return null;

  return (
    <div
      className="fixed inset-x-0 top-0 z-40 px-4 pt-[calc(env(safe-area-inset-top)+0.5rem)]"
      role="status"
      aria-live="polite"
    >
      <div className="mx-auto flex max-w-md items-center justify-center gap-2 rounded-b-xl bg-ink/90 px-4 py-2 text-xs font-medium text-canvas shadow-card backdrop-blur">
        <span
          className="h-1.5 w-1.5 rounded-full bg-amber-400"
          aria-hidden
        />
        Offline — browsing your saved library. Changes need a connection.
      </div>
    </div>
  );
}
