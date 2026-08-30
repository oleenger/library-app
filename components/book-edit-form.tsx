"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Work } from "@/lib/types";
import { PERIODS, MOVEMENTS } from "@/lib/taxonomy";

interface Props {
  work: Work;
}

const inputClass =
  "mt-1.5 block w-full rounded-xl border border-paper-edge bg-paper px-3.5 py-2.5 text-sm text-ink shadow-sm transition-colors placeholder:text-ink-faint hover:border-ink-faint focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/12";
const labelClass =
  "text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-ink-faint";

export function BookEditForm({ work }: Props) {
  const router = useRouter();
  const c = work.classification;

  const [title, setTitle] = useState(work.title);
  const [author, setAuthor] = useState(work.author);
  const [authorSort, setAuthorSort] = useState(work.authorSort ?? "");
  const [firstPublished, setFirstPublished] = useState(
    work.originalYear != null ? String(work.originalYear) : "",
  );
  const [language, setLanguage] = useState(work.language ?? "");
  const [period, setPeriod] = useState(c.period ?? "");
  const [primary, setPrimary] = useState(c.primaryMovement ?? "");
  const [secondary, setSecondary] = useState<string[]>(c.secondaryMovements);
  const [notes, setNotes] = useState(work.notes ?? "");

  const [read, setRead] = useState(Boolean(work.reading));
  const [dateRead, setDateRead] = useState(work.reading?.dateRead ?? "");
  const [rating, setRating] = useState(
    work.reading?.rating != null ? String(work.reading.rating) : "",
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  function toggleSecondary(m: string) {
    setSecondary((s) => (s.includes(m) ? s.filter((x) => x !== m) : [...s, m]));
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/books/${work.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          author: author.trim(),
          authorSort: authorSort.trim() || null,
          firstPublished: firstPublished.trim()
            ? Number.parseInt(firstPublished, 10)
            : null,
          originalLanguage: language.trim() || null,
          period: period || null,
          primaryMovement: primary || null,
          secondaryMovements: secondary,
          notes: notes.trim() || null,
          read,
          dateRead: read ? dateRead.trim() || null : null,
          rating: read && rating ? Number.parseInt(rating, 10) : null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.detail ?? json.error ?? "Save failed");
        setSaving(false);
        return;
      }
      // A merge returns the surviving work's id (differs from this one when the
      // edited title/author matched an existing work and they were folded).
      router.push(`/book/${json.id ?? work.id}`);
      router.refresh();
    } catch (err) {
      setError(String(err));
      setSaving(false);
    }
  }

  async function remove() {
    if (
      !window.confirm(
        `Delete “${work.title}” by ${work.author}? This cannot be undone.`,
      )
    ) {
      return;
    }
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/books/${work.id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.detail ?? json.error ?? "Delete failed");
        setDeleting(false);
        return;
      }
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(String(err));
      setDeleting(false);
    }
  }

  // Secondary options exclude the chosen primary to avoid a redundant pick.
  const secondaryOptions = MOVEMENTS.filter((m) => m !== primary);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
      className="space-y-8"
    >
      <section className="rounded-2xl border border-paper-edge bg-white p-6 shadow-card sm:p-8">
        <h2 className="text-xs font-semibold text-accent">Bibliographic</h2>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className={labelClass}>Title</span>
            <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} required />
          </label>
          <label className="block">
            <span className={labelClass}>Author</span>
            <input className={inputClass} value={author} onChange={(e) => setAuthor(e.target.value)} required />
          </label>
          <label className="block">
            <span className={labelClass}>Sort name (Last, First)</span>
            <input
              className={inputClass}
              value={authorSort}
              onChange={(e) => setAuthorSort(e.target.value)}
              placeholder="Auto from author if blank"
            />
          </label>
          <label className="block">
            <span className={labelClass}>Year first published</span>
            <input
              className={inputClass}
              value={firstPublished}
              onChange={(e) => setFirstPublished(e.target.value)}
              inputMode="numeric"
              placeholder="e.g. 1866 (negative = BCE)"
            />
          </label>
          <label className="block">
            <span className={labelClass}>Original language</span>
            <input className={inputClass} value={language} onChange={(e) => setLanguage(e.target.value)} />
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-paper-edge bg-white p-6 shadow-card sm:p-8">
        <h2 className="text-xs font-semibold text-accent">Classification</h2>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <label className="block">
            <span className={labelClass}>Period</span>
            <select className={inputClass} value={period} onChange={(e) => setPeriod(e.target.value)}>
              <option value="">— None —</option>
              {PERIODS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className={labelClass}>Primary movement</span>
            <select
              className={inputClass}
              value={primary}
              onChange={(e) => {
                const next = e.target.value;
                setPrimary(next);
                setSecondary((s) => s.filter((m) => m !== next));
              }}
            >
              <option value="">— None —</option>
              {MOVEMENTS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </label>
        </div>
        <fieldset className="mt-5">
          <legend className={labelClass}>Secondary movements</legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {secondaryOptions.map((m) => {
              const on = secondary.includes(m);
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => toggleSecondary(m)}
                  aria-pressed={on}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                    on
                      ? "border-accent bg-accent text-white shadow-sm"
                      : "border-paper-edge bg-paper text-ink-soft hover:border-ink-faint hover:text-ink"
                  }`}
                >
                  {m}
                </button>
              );
            })}
          </div>
        </fieldset>
        <label className="mt-5 block">
          <span className={labelClass}>Notes</span>
          <textarea
            className={`${inputClass} min-h-20 resize-y`}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>
      </section>

      <section className="rounded-2xl border border-paper-edge bg-white p-6 shadow-card sm:p-8">
        <h2 className="text-xs font-semibold text-accent">Read status</h2>
        <label className="mt-5 inline-flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={read}
            onChange={(e) => setRead(e.target.checked)}
            className="h-4 w-4 rounded border-paper-edge text-accent focus:ring-accent"
          />
          <span className="text-sm font-medium text-ink">I have read this</span>
        </label>
        {read && (
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <label className="block">
              <span className={labelClass}>Date read</span>
              <input
                type="date"
                className={inputClass}
                value={dateRead}
                onChange={(e) => setDateRead(e.target.value)}
              />
            </label>
            <label className="block">
              <span className={labelClass}>Rating</span>
              <select className={inputClass} value={rating} onChange={(e) => setRating(e.target.value)}>
                <option value="">— Unrated —</option>
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>{"★".repeat(n)}</option>
                ))}
              </select>
            </label>
          </div>
        )}
        <p className="mt-4 text-xs text-ink-faint">
          A read status set here is kept as a manual entry and is never overwritten
          by a Goodreads reconcile.
        </p>
      </section>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving || deleting}
          className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-ink disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
        <Link
          href={`/book/${work.id}`}
          className="rounded-xl border border-paper-edge bg-paper px-5 py-2.5 text-sm font-semibold text-ink-soft transition hover:border-ink-faint hover:text-ink"
        >
          Cancel
        </Link>
        <button
          type="button"
          onClick={() => void remove()}
          disabled={saving || deleting}
          className="ml-auto inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-5 py-2.5 text-sm font-semibold text-red-700 transition hover:border-red-300 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {deleting ? "Deleting…" : "Delete book"}
        </button>
      </div>
    </form>
  );
}
