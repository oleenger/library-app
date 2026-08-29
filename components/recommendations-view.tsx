"use client";

import { useState } from "react";
import type { RecommendationCache } from "@/lib/recommend/store";

const MIN_READS = 3;

type State =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "error"; message: string; retryAfter?: number };

function formatWhen(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function RecommendationsView({
  initial,
  stale,
  readCount,
}: {
  initial: RecommendationCache | null;
  stale: boolean;
  readCount: number;
}) {
  const [cache, setCache] = useState<RecommendationCache | null>(initial);
  const [isStale, setIsStale] = useState(stale);
  const [state, setState] = useState<State>({ phase: "idle" });

  const enoughReads = readCount >= MIN_READS;

  async function generate(refresh: boolean) {
    if (!enoughReads || state.phase === "loading") return;
    setState({ phase: "loading" });
    try {
      const url = refresh ? "/api/recommendations?refresh=1" : "/api/recommendations";
      const res = await fetch(url, { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        setState({
          phase: "error",
          message: json.hint ?? json.error ?? "Generation failed",
          retryAfter: json.retryAfter,
        });
        return;
      }
      setCache(json as RecommendationCache);
      setIsStale(false);
      setState({ phase: "idle" });
    } catch (err) {
      setState({ phase: "error", message: String(err) });
    }
  }

  const loading = state.phase === "loading";
  const hasItems = cache != null && cache.items.length > 0;

  return (
    <div>
      {!enoughReads && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Mark at least {MIN_READS} books as read to get recommendations.
        </p>
      )}

      {enoughReads && !hasItems && (
        <div className="rounded-2xl border border-paper-edge bg-paper p-8 text-center shadow-card">
          <p className="text-[0.95rem] text-ink-soft">
            No recommendations yet. Generate a set from your reading history.
          </p>
          <button
            type="button"
            onClick={() => generate(false)}
            disabled={loading}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-ink disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Thinking…" : "Generate recommendations"}
          </button>
        </div>
      )}

      {isStale && hasItems && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-paper-edge bg-white px-4 py-3 shadow-sm">
          <p className="text-sm text-ink-soft">
            Your reading history changed since these were generated.
          </p>
          <button
            type="button"
            onClick={() => generate(false)}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-3.5 py-2 text-[0.8rem] font-semibold text-white shadow-sm transition hover:bg-ink disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Thinking…" : "Update"}
          </button>
        </div>
      )}

      {hasItems && (
        <ol className="space-y-4">
          {cache!.items.map((r, i) => (
            <li
              key={`${r.title}-${r.author}-${i}`}
              className="rounded-2xl border border-paper-edge bg-paper p-5 shadow-card sm:p-6"
            >
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="font-serif text-xl leading-snug">
                  {r.title}
                  {r.first_published != null && (
                    <span className="ml-2 text-sm font-normal text-ink-faint tabular-nums">
                      {r.first_published}
                    </span>
                  )}
                </h2>
              </div>
              <p className="mt-0.5 text-sm text-ink-soft">{r.author}</p>
              {(r.period || r.primary_movement) && (
                <p className="mt-2 flex flex-wrap gap-1.5">
                  {[r.period, r.primary_movement].filter(Boolean).map((t) => (
                    <span
                      key={t}
                      className="rounded-full border border-paper-edge bg-white px-2.5 py-0.5 text-[0.68rem] font-medium text-ink-soft"
                    >
                      {t}
                    </span>
                  ))}
                </p>
              )}
              <p className="mt-3 text-[0.9rem] leading-6 text-ink">{r.reason}</p>
            </li>
          ))}
        </ol>
      )}

      {state.phase === "error" && (
        <p className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.message}
          {state.retryAfter ? ` (try again in ${state.retryAfter}s)` : ""}
        </p>
      )}

      {hasItems && (
        <div className="mt-8 flex flex-wrap items-center gap-4 text-xs text-ink-faint">
          <span>
            Generated {formatWhen(cache!.generatedAt)} · {cache!.model} · from{" "}
            {cache!.basedOn} read {cache!.basedOn === 1 ? "book" : "books"}
          </span>
          {!isStale && (
            <button
              type="button"
              onClick={() => generate(true)}
              disabled={loading}
              className="font-semibold text-accent hover:underline disabled:opacity-50"
            >
              {loading ? "Thinking…" : "Regenerate"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
