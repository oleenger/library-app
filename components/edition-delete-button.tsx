"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Per-edition delete control on the book detail page. Confirms, calls the
// edition DELETE route, then refreshes the server component so the list updates.
// `shared` editions (an omnibus held by another work too) are only unlinked
// from this work, which the confirm copy makes explicit.
export function EditionDeleteButton({
  workId,
  editionId,
  editionLabel,
  shared,
}: {
  workId: string;
  editionId: string;
  editionLabel: string;
  shared: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    const prompt = shared
      ? `Remove “${editionLabel}” from this book? It stays in your library under the other work(s) it contains.`
      : `Delete the edition “${editionLabel}”? This cannot be undone.`;
    if (!window.confirm(prompt)) return;

    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/books/${workId}/editions/${editionId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.detail ?? json.error ?? "Delete failed");
        setBusy(false);
        return;
      }
      router.refresh();
    } catch (err) {
      setError(String(err));
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end">
      <button
        type="button"
        onClick={remove}
        disabled={busy}
        aria-label={`Delete edition ${editionLabel}`}
        title="Delete this edition"
        className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-paper-edge bg-paper text-ink-faint shadow-sm transition-colors hover:border-red-300 hover:text-red-600 disabled:opacity-50"
      >
        {busy ? (
          <svg viewBox="0 0 24 24" className="h-4 w-4 animate-spin" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M12 3a9 9 0 1 0 9 9" strokeLinecap="round" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m2 0v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V7" />
            <path d="M10 11v6M14 11v6" />
          </svg>
        )}
      </button>
      {error && <span className="mt-1 max-w-[8rem] text-right text-[0.65rem] text-red-600">{error}</span>}
    </div>
  );
}
