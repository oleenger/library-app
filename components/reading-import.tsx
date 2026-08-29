"use client";

import Link from "next/link";
import { useState } from "react";

interface ImportSummary {
  totalReadsInExport: number;
  matched: number;
  exactMatches: number;
  llmMatches: number;
  unmatchedLibrary: number;
  unmatchedGoodreads: number;
  llmUsed: boolean;
  llmError: string | null;
  totalReadWorks: number;
}

type State =
  | { phase: "idle" }
  | { phase: "uploading" }
  | { phase: "done"; summary: ImportSummary }
  | { phase: "error"; message: string };

export function ReadingImport() {
  const [file, setFile] = useState<File | null>(null);
  const [state, setState] = useState<State>({ phase: "idle" });

  async function submit() {
    if (!file) return;
    setState({ phase: "uploading" });
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/reading/import", { method: "POST", body });
      const json = await res.json();
      if (!res.ok) {
        setState({ phase: "error", message: json.error ?? "Import failed" });
        return;
      }
      setState({ phase: "done", summary: json as ImportSummary });
    } catch (err) {
      setState({ phase: "error", message: String(err) });
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="rounded-2xl border border-paper-edge bg-paper p-6 shadow-card sm:p-8">
        <label className="block">
          <span className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-ink-faint">
            Goodreads export (.csv)
          </span>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setState({ phase: "idle" });
            }}
            className="mt-3 block w-full text-sm text-ink-soft file:mr-4 file:rounded-full file:border-0 file:bg-ink file:px-4 file:py-2 file:text-sm file:font-semibold file:text-canvas hover:file:bg-accent"
          />
        </label>

        <p className="mt-4 text-sm leading-6 text-ink-soft">
          Only titles already in your library are marked read — no new books are
          added. Export from Goodreads via <em>My Books → Import/Export → Export</em>.
        </p>

        <button
          type="button"
          onClick={submit}
          disabled={!file || state.phase === "uploading"}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-ink disabled:cursor-not-allowed disabled:opacity-50"
        >
          {state.phase === "uploading" ? "Matching…" : "Import reads"}
        </button>
      </div>

      {state.phase === "error" && (
        <p className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.message}
        </p>
      )}

      {state.phase === "done" && <Summary summary={state.summary} />}

      <Reconcile />
    </div>
  );
}

interface ReconcileSummary {
  shelfSize: number;
  matched: number;
  totalReadWorks: number;
}

type ReconcileState =
  | { phase: "idle" }
  | { phase: "running" }
  | { phase: "done"; summary: ReconcileSummary }
  | { phase: "error"; message: string };

/**
 * Replay the persisted Goodreads shelf against the current library — the path for
 * books added AFTER the last export was uploaded. No file needed.
 */
function Reconcile() {
  const [state, setState] = useState<ReconcileState>({ phase: "idle" });

  async function run() {
    setState({ phase: "running" });
    try {
      const res = await fetch("/api/reading/reconcile", { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        setState({ phase: "error", message: json.error ?? "Reconcile failed" });
        return;
      }
      setState({ phase: "done", summary: json as ReconcileSummary });
    } catch (err) {
      setState({ phase: "error", message: String(err) });
    }
  }

  return (
    <div className="mt-6 rounded-2xl border border-paper-edge bg-paper p-6 shadow-card sm:p-8">
      <h2 className="text-sm font-semibold text-ink">Re-match after adding books</h2>
      <p className="mt-2 text-sm leading-6 text-ink-soft">
        Already uploaded your export? Run this after cataloguing new books to mark
        any that are on your saved Goodreads shelf as read — no re-upload needed.
        Read statuses you set by hand are never touched.
      </p>
      <button
        type="button"
        onClick={run}
        disabled={state.phase === "running"}
        className="mt-5 inline-flex items-center gap-2 rounded-xl border border-paper-edge bg-white px-4 py-2.5 text-sm font-semibold text-ink shadow-sm transition hover:border-ink-faint disabled:cursor-not-allowed disabled:opacity-50"
      >
        {state.phase === "running" ? "Reconciling…" : "Reconcile now"}
      </button>

      {state.phase === "error" && (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.message}
        </p>
      )}
      {state.phase === "done" && (
        <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Replayed {state.summary.shelfSize} shelf {state.summary.shelfSize === 1 ? "entry" : "entries"};{" "}
          {state.summary.matched} matched. {state.summary.totalReadWorks} total read works.
        </p>
      )}
    </div>
  );
}

function Summary({ summary: s }: { summary: ImportSummary }) {
  return (
    <div className="enter-up mt-6 rounded-2xl border border-paper-edge bg-white p-6 shadow-card sm:p-8">
      <h2 className="font-serif text-2xl">Import complete</h2>
      <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
        <Stat label="Matched" value={s.matched} accent />
        <Stat label="Exact" value={s.exactMatches} />
        <Stat label="LLM" value={s.llmMatches} />
        <Stat label="Read in export" value={s.totalReadsInExport} />
        <Stat label="No library match" value={s.unmatchedGoodreads} />
        <Stat label="Total read works" value={s.totalReadWorks} />
      </dl>

      {s.llmError && (
        <p className="mt-5 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
          {s.llmError}
        </p>
      )}
      {!s.llmUsed && !s.llmError && (
        <p className="mt-5 text-xs text-ink-faint">
          All matches were exact; the LLM tier was not needed.
        </p>
      )}

      <Link
        href="/"
        className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-accent hover:underline"
      >
        View library →
      </Link>
    </div>
  );
}

function Stat({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div>
      <dd className={`font-serif text-3xl tabular-nums ${accent ? "text-accent" : "text-ink"}`}>
        {value}
      </dd>
      <dt className="mt-1 text-[0.6rem] font-medium uppercase tracking-[0.14em] text-ink-faint">
        {label}
      </dt>
    </div>
  );
}
