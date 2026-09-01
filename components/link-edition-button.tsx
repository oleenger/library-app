"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export interface LinkCandidate {
  id: string;
  title: string;
  author: string;
  language: string | null;
}

// "Link as edition of…" control on the book detail page. Lets the owner declare
// that this work (typically a separately-imported translation) is really an
// edition of an existing canonical work: it searches the catalogue, and on
// confirm folds this work's edition(s) onto the chosen target, then navigates
// to the survivor. Backed by POST /api/books/[id]/link-edition.
export function LinkEditionButton({
  sourceId,
  sourceTitle,
  candidates,
}: {
  sourceId: string;
  sourceTitle: string;
  candidates: LinkCandidate[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [] as LinkCandidate[];
    return candidates
      .filter(
        (c) =>
          c.title.toLowerCase().includes(q) || c.author.toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [query, candidates]);

  async function link(target: LinkCandidate) {
    const ok = window.confirm(
      `Link “${sourceTitle}” as an edition of “${target.title}” by ${target.author}?\n\n` +
        `This book's edition(s) move onto that work, and this separate entry is removed. ` +
        `You'll be taken to the combined book.`,
    );
    if (!ok) return;

    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/books/${sourceId}/link-edition`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetId: target.id }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.detail ?? json.error ?? "Link failed");
        setBusy(false);
        return;
      }
      router.push(`/book/${json.id}`);
      router.refresh();
    } catch (err) {
      setError(String(err));
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-[0.7rem] border border-paper-edge bg-paper px-4 py-2.5 text-sm font-semibold text-ink-soft shadow-sm transition-colors hover:border-ink-faint hover:text-ink"
      >
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-4 w-4" aria-hidden>
          <path d="M8 11.5 12 7.5m-3.2.3L10 6.6a2.5 2.5 0 0 1 3.5 3.5l-1.2 1.2m-4.6-.6L6.5 12a2.5 2.5 0 0 0 3.5 3.5l1.2-1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Link as edition of…
      </button>
    );
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-paper-edge bg-paper-raised p-4 shadow-card">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-ink-faint">
          Link as an edition of…
        </p>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setQuery("");
            setError(null);
          }}
          className="text-xs font-semibold text-ink-faint transition-colors hover:text-ink"
        >
          Cancel
        </button>
      </div>

      <input
        type="search"
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by title or author…"
        disabled={busy}
        className="mt-3 w-full rounded-xl border border-paper-edge bg-paper px-3 py-2.5 text-sm text-ink shadow-inner outline-none transition-colors placeholder:text-ink-faint focus:border-accent disabled:opacity-50"
      />

      {query.trim() && matches.length === 0 && (
        <p className="mt-3 text-sm text-ink-soft">No other book matches that.</p>
      )}

      {matches.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {matches.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => link(c)}
                disabled={busy}
                className="flex w-full items-center gap-3 rounded-xl border border-paper-edge bg-paper px-3 py-2.5 text-left shadow-sm transition-colors hover:border-accent disabled:opacity-50"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{c.title}</p>
                  <p className="truncate text-xs text-ink-soft">
                    {c.author}
                    {c.language ? ` · ${c.language}` : ""}
                  </p>
                </div>
                <span className="shrink-0 text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-accent">
                  Link ↗
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && <p className="mt-3 text-xs text-red-600">{error}</p>}
    </div>
  );
}
