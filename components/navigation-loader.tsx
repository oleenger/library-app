"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * A thin top progress bar that appears while navigating between pages. Server
 * components (this app renders them dynamically) can take a moment to respond,
 * so we surface a subtle "loading" cue the instant an internal link is clicked
 * and complete it once the new route commits — the standard app-navigation hint.
 */
export function NavigationLoader() {
  const pathname = usePathname();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  const trickle = useRef<number | null>(null);
  const done = useRef<number | null>(null);
  const safety = useRef<number | null>(null);

  function clearTimers() {
    if (trickle.current) window.clearInterval(trickle.current);
    if (done.current) window.clearTimeout(done.current);
    if (safety.current) window.clearTimeout(safety.current);
    trickle.current = done.current = safety.current = null;
  }

  function start() {
    clearTimers();
    setVisible(true);
    setProgress(8);
    // Creep toward 90% while the next page is being fetched.
    trickle.current = window.setInterval(() => {
      setProgress((p) => (p >= 90 ? p : p + Math.max(0.5, (90 - p) * 0.08)));
    }, 200);
    // Never let the bar hang forever if a navigation is cancelled.
    safety.current = window.setTimeout(finish, 8000);
  }

  function finish() {
    clearTimers();
    setProgress(100);
    done.current = window.setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 280);
  }

  // Begin as soon as the user initiates an internal navigation.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (
        e.defaultPrevented ||
        e.button !== 0 ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey
      )
        return;
      const anchor = (e.target as HTMLElement | null)?.closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;
      let url: URL;
      try {
        url = new URL(anchor.href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      // Same page (or in-page hash) — no navigation to indicate.
      if (url.pathname === window.location.pathname) return;
      start();
    }
    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", start);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", start);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The new route has rendered — complete the bar.
  useEffect(() => {
    finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => clearTimers, []);

  if (!visible) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-[70]"
    >
      <div
        className="h-[3px] bg-accent shadow-[0_0_10px_1px_rgba(28,107,80,0.6)] transition-[width,opacity] duration-200 ease-out"
        style={{ width: `${progress}%`, opacity: progress >= 100 ? 0 : 1 }}
      />
    </div>
  );
}
