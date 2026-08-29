"use client";

import { useState } from "react";
import { formatYear, periodColor } from "@/lib/display";
import type { StoredSet, RecKind } from "@/lib/recommend/store";
import type { CanonGap, Recommendation } from "@/lib/recommend/schema";

const SHORT_PERIOD: Record<string, string> = {
  "Classical / Antiquity": "Classical",
  "Renaissance / Early Modern": "Renaissance",
  "Enlightenment / Neoclassical": "Enlightenment",
  "Victorian / 19th century": "Victorian",
  "Modernist / early 20th century": "Modernist",
  "Postwar / late 20th century": "Postwar",
};

function shortPeriod(period: string | null | undefined): string {
  if (!period) return "Unclassified";
  return SHORT_PERIOD[period] ?? period;
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function RecommendationsView({
  taste,
  canon,
  tasteStale,
  canonStale,
  readCount,
  workCount,
}: {
  taste: StoredSet<Recommendation> | null;
  canon: StoredSet<CanonGap> | null;
  tasteStale: boolean;
  canonStale: boolean;
  readCount: number;
  workCount: number;
}) {
  return (
    <div className="space-y-14">
      <RecSection
        kind="taste"
        title="From your reading history"
        subtitle="Books to read next, inferred from what you've read and rated."
        initial={taste}
        stale={tasteStale}
        enabled={readCount >= 3}
        disabledHint="Mark at least 3 books as read to get recommendations."
        renderRow={(item) => <BookRow key={item.title + item.author} item={item} />}
      />

      <RecSection
        kind="canon"
        title="Canon gaps"
        subtitle="Major works your library lacks to be well-rounded, scored by importance."
        initial={canon}
        stale={canonStale}
        enabled={workCount >= 5}
        disabledHint="Add at least 5 books first."
        renderRow={(item) => <BookRow key={item.title + item.author} item={item} />}
      />
    </div>
  );
}

type State =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "error"; message: string; retryAfter?: number };

function RecSection<T extends Recommendation | CanonGap>({
  kind,
  title,
  subtitle,
  initial,
  stale,
  enabled,
  disabledHint,
  renderRow,
}: {
  kind: RecKind;
  title: string;
  subtitle: string;
  initial: StoredSet<T> | null;
  stale: boolean;
  enabled: boolean;
  disabledHint: string;
  renderRow: (item: T) => React.ReactNode;
}) {
  const [set, setSet] = useState<StoredSet<T> | null>(initial);
  const [isStale, setIsStale] = useState(stale);
  const [state, setState] = useState<State>({ phase: "idle" });

  const loading = state.phase === "loading";
  const items = set?.items ?? [];
  const hasItems = items.length > 0;

  async function generate(refresh: boolean) {
    if (!enabled || loading) return;
    setState({ phase: "loading" });
    try {
      const q = new URLSearchParams({ kind });
      if (refresh) q.set("refresh", "1");
      const res = await fetch(`/api/recommendations?${q}`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        setState({
          phase: "error",
          message: json.hint ?? json.error ?? "Generation failed",
          retryAfter: json.retryAfter,
        });
        return;
      }
      setSet(json as StoredSet<T>);
      setIsStale(false);
      setState({ phase: "idle" });
    } catch (err) {
      setState({ phase: "error", message: String(err) });
    }
  }

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl leading-tight sm:text-3xl">{title}</h2>
          <p className="mt-1 text-sm text-ink-soft">{subtitle}</p>
        </div>
        {enabled && hasItems && !isStale && (
          <button
            type="button"
            onClick={() => generate(true)}
            disabled={loading}
            className="rounded-xl border border-paper-edge bg-paper px-3.5 py-2 text-[0.8rem] font-semibold text-ink-soft shadow-sm transition hover:border-ink-faint hover:text-ink disabled:opacity-50"
          >
            {loading ? "Thinking…" : "Regenerate"}
          </button>
        )}
      </div>

      {!enabled && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {disabledHint}
        </p>
      )}

      {enabled && !hasItems && (
        <div className="rounded-2xl border border-paper-edge bg-paper p-8 text-center shadow-card">
          <p className="text-[0.95rem] text-ink-soft">Nothing generated yet.</p>
          <button
            type="button"
            onClick={() => generate(false)}
            disabled={loading}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-ink disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Thinking…" : "Generate"}
          </button>
        </div>
      )}

      {isStale && hasItems && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-paper-edge bg-white px-4 py-3 shadow-sm">
          <p className="text-sm text-ink-soft">
            Your library changed since these were generated.
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
        <div className="overflow-hidden rounded-2xl border border-paper-edge bg-paper shadow-card">
          <div className="flex items-center justify-between border-b border-paper-edge px-5 py-4 sm:px-6">
            <p className="text-sm text-ink-soft">
              <span className="font-serif text-lg text-ink">{items.length}</span>{" "}
              {items.length === 1 ? "book" : "books"}
            </p>
            <span className="text-[0.7rem] font-medium uppercase tracking-[0.12em] text-ink-faint">
              {kind === "canon" ? "By importance" : "Best match first"}
            </span>
          </div>
          <ol className="divide-y divide-paper-edge">{items.map(renderRow)}</ol>
        </div>
      )}

      {state.phase === "error" && (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.message}
          {state.retryAfter ? ` (try again in ${state.retryAfter}s)` : ""}
        </p>
      )}

      {hasItems && set && (
        <p className="mt-3 text-xs text-ink-faint">
          Generated {formatWhen(set.generatedAt)} · {set.model}
        </p>
      )}
    </section>
  );
}

/** A recommended book, laid out like a front-page library row (no explanation). */
function BookRow({ item }: { item: Recommendation | CanonGap }) {
  const period = item.period ?? null;
  const color = periodColor(period);
  const importance = "importance" in item ? item.importance : null;

  return (
    <li className="flex items-center gap-4 px-5 py-4 sm:px-6">
      <span
        className="h-10 w-1 shrink-0 rounded-full"
        style={{ backgroundColor: color }}
        aria-hidden
      />
      {importance != null && <ScoreBadge value={importance} />}
      <div className="min-w-0 flex-1">
        <h3 className="truncate font-serif text-lg leading-tight text-ink">{item.title}</h3>
        <p className="mt-0.5 truncate text-sm text-ink-soft">{item.author}</p>
        <span
          className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-medium sm:hidden"
          style={{ color }}
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} aria-hidden />
          {item.primary_movement ?? shortPeriod(period)}
        </span>
      </div>
      <span className="hidden shrink-0 items-center gap-2 rounded-full border border-paper-edge bg-paper px-3 py-1 text-xs font-medium text-ink-soft sm:inline-flex">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} aria-hidden />
        {item.primary_movement ?? shortPeriod(period)}
      </span>
      <span className="w-12 shrink-0 text-right text-sm tabular-nums text-ink-faint">
        {formatYear(item.first_published ?? null)}
      </span>
    </li>
  );
}

/** Importance 1..10, shown as a weighted numeric badge (10 = cornerstone). */
function ScoreBadge({ value }: { value: number }) {
  const tone =
    value >= 9
      ? "bg-ink text-canvas"
      : value >= 7
        ? "bg-accent/12 text-accent ring-1 ring-inset ring-accent/25"
        : "bg-paper-sunken text-ink-soft ring-1 ring-inset ring-paper-edge";
  return (
    <span
      className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg font-serif text-base tabular-nums ${tone}`}
      title={`Importance ${value}/10`}
      aria-label={`Importance ${value} out of 10`}
    >
      {value}
    </span>
  );
}
