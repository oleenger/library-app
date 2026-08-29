"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Work } from "@/lib/types";

type StatusFilter = "all" | "read" | "unread";

const norm = (s: string) => s.toLowerCase();

export function ReadStatusManager({ works }: { works: Work[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("unread");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = norm(query.trim());
    return works.filter((w) => {
      if (status === "read" && !w.reading) return false;
      if (status === "unread" && w.reading) return false;
      if (!q) return true;
      return norm(w.title).includes(q) || norm(w.author).includes(q);
    });
  }, [works, query, status]);

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((w) => selected.has(w.id));

  function toggle(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setNotice(null);
  }

  function toggleAllFiltered() {
    setSelected((s) => {
      const next = new Set(s);
      if (allFilteredSelected) {
        for (const w of filtered) next.delete(w.id);
      } else {
        for (const w of filtered) next.add(w.id);
      }
      return next;
    });
    setNotice(null);
  }

  function clearSelection() {
    setSelected(new Set());
    setNotice(null);
  }

  async function apply(read: boolean) {
    if (selected.size === 0) return;
    setSaving(true);
    setNotice(null);
    try {
      const res = await fetch("/api/books/read-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workIds: [...selected], read }),
      });
      const json = await res.json();
      if (!res.ok) {
        setNotice(json.detail ?? json.error ?? "Update failed");
        setSaving(false);
        return;
      }
      setNotice(
        `${read ? "Marked read" : "Marked unread"}: ${json.affected} ${json.affected === 1 ? "book" : "books"}.`,
      );
      setSelected(new Set());
      router.refresh();
    } catch (err) {
      setNotice(String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      {/* Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="relative flex-1">
          <span className="sr-only">Search title or author</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search title or author"
            className="h-11 w-full rounded-full border border-paper-edge bg-paper px-4 text-sm text-ink shadow-card transition-colors placeholder:text-ink-faint hover:border-ink-faint focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/12"
          />
        </label>
        <div className="inline-flex shrink-0 rounded-full border border-paper-edge bg-paper p-0.5">
          {(
            [
              ["unread", "Unread"],
              ["read", "Read"],
              ["all", "All"],
            ] as const
          ).map(([v, label]) => {
            const on = status === v;
            return (
              <button
                key={v}
                type="button"
                onClick={() => setStatus(v)}
                aria-pressed={on}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                  on ? "bg-ink text-canvas shadow-sm" : "text-ink-soft hover:text-ink"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Select-all row */}
      <div className="mt-4 flex items-center justify-between px-1">
        <label className="inline-flex cursor-pointer items-center gap-2.5 text-sm text-ink-soft">
          <input
            type="checkbox"
            checked={allFilteredSelected}
            onChange={toggleAllFiltered}
            className="h-4 w-4 rounded border-paper-edge text-accent focus:ring-accent"
          />
          Select all {filtered.length} shown
        </label>
        <span className="text-xs text-ink-faint">
          {selected.size} selected
        </span>
      </div>

      {/* List */}
      <ul className="mt-2 divide-y divide-paper-edge overflow-hidden rounded-2xl border border-paper-edge bg-paper shadow-card">
        {filtered.length === 0 ? (
          <li className="px-5 py-16 text-center text-sm text-ink-soft">
            No books match.
          </li>
        ) : (
          filtered.map((w) => {
            const on = selected.has(w.id);
            return (
              <li key={w.id}>
                <label
                  className={`flex cursor-pointer items-center gap-4 px-5 py-3 transition-colors ${
                    on ? "bg-accent/8" : "hover:bg-paper-sunken/60"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => toggle(w.id)}
                    className="h-4 w-4 rounded border-paper-edge text-accent focus:ring-accent"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-serif text-base leading-tight text-ink">
                      {w.title}
                    </p>
                    <p className="mt-0.5 truncate text-sm text-ink-soft">{w.author}</p>
                  </div>
                  {w.reading && (
                    <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                      Read
                    </span>
                  )}
                </label>
              </li>
            );
          })
        )}
      </ul>

      {/* Sticky action bar */}
      <div className="sticky bottom-4 z-30 mt-5">
        <div className="mx-auto flex max-w-xl items-center gap-3 rounded-2xl border border-paper-edge bg-white/95 p-3 shadow-lg backdrop-blur">
          <span className="pl-2 text-sm font-medium text-ink">
            {selected.size} selected
          </span>
          <div className="ml-auto flex items-center gap-2">
            {selected.size > 0 && (
              <button
                type="button"
                onClick={clearSelection}
                className="rounded-xl border border-paper-edge bg-paper px-3.5 py-2 text-sm font-semibold text-ink-soft transition hover:border-ink-faint hover:text-ink"
              >
                Clear
              </button>
            )}
            <button
              type="button"
              onClick={() => apply(false)}
              disabled={saving || selected.size === 0}
              className="rounded-xl border border-paper-edge bg-paper px-4 py-2 text-sm font-semibold text-ink transition hover:border-ink-faint disabled:cursor-not-allowed disabled:opacity-40"
            >
              Mark unread
            </button>
            <button
              type="button"
              onClick={() => apply(true)}
              disabled={saving || selected.size === 0}
              className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-ink disabled:cursor-not-allowed disabled:opacity-40"
            >
              {saving ? "Saving…" : "Mark read"}
            </button>
          </div>
        </div>
        {notice && (
          <p className="mx-auto mt-3 max-w-xl rounded-xl border border-paper-edge bg-white px-4 py-2.5 text-center text-sm text-ink-soft shadow-card">
            {notice}
          </p>
        )}
      </div>
    </div>
  );
}
