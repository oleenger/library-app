"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { refreshCatalogue } from "@/lib/actions/refresh";

const THRESHOLD = 70; // px of resisted pull needed to trigger a refresh
const MAX = 100; // px the surface can be dragged

// In the installed PWA the service worker serves pages stale-while-revalidate,
// so a plain router.refresh() would paint the cached copy. Drop the page caches
// first (and wait for the SW to confirm) so the refresh fetches live content.
async function purgeServiceWorkerPageCaches(): Promise<void> {
  if (typeof navigator === "undefined") return;
  const controller = navigator.serviceWorker?.controller;
  if (!controller) return;
  await new Promise<void>((resolve) => {
    const channel = new MessageChannel();
    channel.port1.onmessage = () => resolve();
    // Never block the refresh on a wedged SW.
    window.setTimeout(resolve, 400);
    controller.postMessage({ type: "INVALIDATE_PAGES" }, [channel.port2]);
  });
}

/**
 * Mobile pull-to-refresh. When the page is scrolled to the very top, dragging
 * down reveals a spinner and, past the threshold, re-runs the server component
 * via router.refresh(). Native browser pull-to-refresh is suppressed globally
 * with `overscroll-behavior-y: contain` so the two gestures don't fight.
 */
export function PullToRefresh({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const startY = useRef<number | null>(null);
  const pullRef = useRef(0);
  const busyRef = useRef(false);

  useEffect(() => {
    function onStart(e: TouchEvent) {
      if (busyRef.current) return;
      startY.current =
        window.scrollY <= 0 && e.touches.length === 1 ? e.touches[0].clientY : null;
    }
    function onMove(e: TouchEvent) {
      if (startY.current === null || busyRef.current) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy <= 0) {
        pullRef.current = 0;
        setPull(0);
        return;
      }
      // diminishing resistance so the drag feels elastic
      const p = Math.min(dy * 0.5, MAX);
      pullRef.current = p;
      setPull(p);
    }
    function onEnd() {
      if (startY.current === null) return;
      startY.current = null;
      if (pullRef.current >= THRESHOLD && !busyRef.current) {
        busyRef.current = true;
        setRefreshing(true);
        pullRef.current = THRESHOLD;
        setPull(THRESHOLD);
        // Invalidate the cached catalogue, then re-render this route with the
        // fresh read. A short floor keeps the spinner legible on a fast refresh.
        const started = Date.now();
        void (async () => {
          try {
            await refreshCatalogue();
            await purgeServiceWorkerPageCaches();
            router.refresh();
          } finally {
            const wait = Math.max(0, 500 - (Date.now() - started));
            window.setTimeout(() => {
              busyRef.current = false;
              setRefreshing(false);
              pullRef.current = 0;
              setPull(0);
            }, wait);
          }
        })();
      } else {
        pullRef.current = 0;
        setPull(0);
      }
    }

    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onEnd, { passive: true });
    window.addEventListener("touchcancel", onEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onEnd);
    };
  }, [router]);

  const dragging = startY.current !== null;
  const active = pull > 0 || refreshing;
  const progress = Math.min(pull / THRESHOLD, 1);

  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 z-40 flex justify-center sm:hidden"
        style={{
          transform: `translateY(${active ? Math.max(pull - 18, 14) : -48}px)`,
          opacity: active ? 1 : 0,
          transition: dragging ? "none" : "transform 220ms ease, opacity 220ms ease",
        }}
      >
        <span className="grid h-9 w-9 place-items-center rounded-full border border-paper-edge bg-paper shadow-card">
          <svg
            viewBox="0 0 24 24"
            className={`h-5 w-5 text-accent ${refreshing ? "animate-spin" : ""}`}
            style={refreshing ? undefined : { transform: `rotate(${progress * 270}deg)` }}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 12a9 9 0 1 1-3-6.7" />
            <path d="M21 3v6h-6" />
          </svg>
        </span>
      </div>

      <div
        style={{
          transform: pull ? `translateY(${pull}px)` : undefined,
          transition: dragging ? "none" : "transform 220ms ease",
        }}
      >
        {children}
      </div>
    </>
  );
}
