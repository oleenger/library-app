"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { LinkCandidate } from "@/components/link-edition-button";

// "I own this" control on a canon gap (an essential work or reading-path step
// the reader doesn't hold under that title). It's the inverse of the edition
// link: the canon work is fixed, and the reader picks which of their owned
// books *is* that work — typically a translation held under a different title
// (e.g. "Rødt og sort" → "The Red and the Black"). On confirm it writes a
// canonical alias onto the chosen owned book via PUT /api/books/[id]/canonical,
// so the matcher counts it as owned/read against the canon from then on.
export function CanonOwnLink({
  canonTitle,
  canonAuthor,
  candidates,
}: {
  canonTitle: string;
  canonAuthor: string;
  candidates: LinkCandidate[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [pending, setPending] = useState<LinkCandidate | null>(null);
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

  function reset() {
    setOpen(false);
    setQuery("");
    setPending(null);
    setError(null);
  }

  async function confirmLink(owned: LinkCandidate) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/books/${owned.id}/canonical`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ canonicalTitle: canonTitle, canonicalAuthor: canonAuthor }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.detail ?? json.error ?? "Link failed");
        setBusy(false);
        return;
      }
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
        className="text-[0.62rem] font-semibold uppercase tracking-[0.1em] text-ink-faint underline decoration-dotted underline-offset-2 transition-colors hover:text-accent"
      >
        I own this
      </button>
    );
  }

  return (
    <div className="mt-2 w-full max-w-md rounded-xl border border-paper-edge bg-paper-raised p-3 shadow-sm">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-ink-faint">
          {pending ? "Confirm this copy" : "Which of your books is this?"}
        </p>
        <button
          type="button"
          onClick={reset}
          className="text-xs font-semibold text-ink-faint transition-colors hover:text-ink"
        >
          Cancel
        </button>
      </div>

      {pending ? (
        <div className="mt-2.5">
          <p className="text-sm leading-relaxed text-ink">
            Mark{" "}
            <span className="font-semibold">{pending.title}</span>{" "}
            <span className="text-ink-soft">by {pending.author}</span> as your copy of{" "}
            <span className="font-semibold">{canonTitle}</span>{" "}
            <span className="text-ink-soft">by {canonAuthor}</span>?
          </p>
          <p className="mt-1.5 text-xs text-ink-faint">
            It&apos;ll count as owned in the canon — and read, if you&apos;ve read it.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => confirmLink(pending)}
              disabled={busy}
              className="rounded-lg bg-accent px-3.5 py-2 text-sm font-semibold text-paper-raised shadow-sm transition-colors hover:bg-accent/90 disabled:opacity-50"
            >
              {busy ? "Linking…" : "Yes, link it"}
            </button>
            <button
              type="button"
              onClick={() => {
                setPending(null);
                setError(null);
              }}
              disabled={busy}
              className="rounded-lg border border-paper-edge bg-paper px-3.5 py-2 text-sm font-semibold text-ink-soft transition-colors hover:text-ink disabled:opacity-50"
            >
              Back
            </button>
          </div>
          {error && <p className="mt-2.5 text-xs text-red-600">{error}</p>}
        </div>
      ) : (
        <>
          <input
            type="search"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your library by title or author…"
            className="mt-2.5 w-full rounded-lg border border-paper-edge bg-paper px-3 py-2 text-sm text-ink shadow-inner outline-none transition-colors placeholder:text-ink-faint focus:border-accent"
          />

          {query.trim() && matches.length === 0 && (
            <p className="mt-2.5 text-sm text-ink-soft">No book in your library matches that.</p>
          )}

          {matches.length > 0 && (
            <ul className="mt-2.5 space-y-1.5">
              {matches.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => setPending(c)}
                    className="flex w-full items-center gap-3 rounded-lg border border-paper-edge bg-paper px-3 py-2 text-left shadow-sm transition-colors hover:border-accent"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink">{c.title}</p>
                      <p className="truncate text-xs text-ink-soft">
                        {c.author}
                        {c.language ? ` · ${c.language}` : ""}
                      </p>
                    </div>
                    <span className="shrink-0 text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-accent">
                      This one ↗
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
