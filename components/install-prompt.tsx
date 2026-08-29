"use client";

import { useEffect, useState } from "react";

// Android Chrome fires `beforeinstallprompt` when the PWA is installable. We
// intercept it, suppress the default mini-infobar, and offer our own quiet,
// dismissible affordance instead. Single-user app: nudge once, never nag.
// Dismissal is remembered in localStorage so it does not reappear every visit.

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "pwa-install-dismissed";

export function InstallPrompt() {
  const [promptEvent, setPromptEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Already installed / running standalone: nothing to offer.
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    if (localStorage.getItem(DISMISS_KEY) === "1") return;

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPromptEvent(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    const onInstalled = () => {
      setVisible(false);
      setPromptEvent(null);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  function dismiss() {
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // Private mode / storage disabled — just hide for this session.
    }
  }

  async function install() {
    if (!promptEvent) return;
    await promptEvent.prompt();
    await promptEvent.userChoice;
    setVisible(false);
    setPromptEvent(null);
  }

  if (!visible) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]"
      role="dialog"
      aria-label="Install The Library"
    >
      <div className="mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-paper-edge bg-paper p-3 pl-4 shadow-card">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-ink font-serif text-base italic text-canvas">
          L
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink">Install The Library</p>
          <p className="truncate text-xs text-ink-soft">
            Add to your home screen for full-screen, offline browsing.
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 rounded-lg px-2.5 py-2 text-xs font-semibold text-ink-soft transition-colors hover:text-ink"
        >
          Not now
        </button>
        <button
          type="button"
          onClick={install}
          className="shrink-0 rounded-lg bg-accent px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-ink"
        >
          Install
        </button>
      </div>
    </div>
  );
}
