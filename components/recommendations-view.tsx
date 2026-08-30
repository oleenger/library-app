"use client";

import { useState } from "react";
import { formatYear, periodColor, shortPeriod } from "@/lib/display";
import type { StoredSet, RecKind } from "@/lib/recommend/store";
import type { CanonFocus, CanonGap, Recommendation } from "@/lib/recommend/schema";

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
  canon: StoredSet<CanonFocus> | null;
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
        renderContent={(set) => <TasteContent set={set} />}
      />

      <RecSection
        kind="canon"
        title="Canon gaps"
        subtitle="Major works you're missing, grouped under the periods and movements you're into."
        initial={canon}
        stale={canonStale}
        enabled={workCount >= 5}
        disabledHint="Add at least 5 books first."
        renderContent={(set) => <CanonContent set={set} />}
      />
    </div>
  );
}

type State =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "error"; message: string; retryAfter?: number };

function itemCount<T>(set: StoredSet<T> | null): number {
  return set?.items?.length ?? 0;
}

function RecSection<T>({
  kind,
  title,
  subtitle,
  initial,
  stale,
  enabled,
  disabledHint,
  renderContent,
}: {
  kind: RecKind;
  title: string;
  subtitle: string;
  initial: StoredSet<T> | null;
  stale: boolean;
  enabled: boolean;
  disabledHint: string;
  renderContent: (set: StoredSet<T>) => React.ReactNode;
}) {
  const [set, setSet] = useState<StoredSet<T> | null>(initial);
  const [isStale, setIsStale] = useState(stale);
  const [state, setState] = useState<State>({ phase: "idle" });

  const loading = state.phase === "loading";
  const hasItems = itemCount(set) > 0;

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

      {hasItems && set && renderContent(set)}

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

/** Taste picks: one front-page-style card, best match first. */
function TasteContent({ set }: { set: StoredSet<Recommendation> }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-paper-edge bg-paper shadow-card">
      <div className="flex items-center justify-between border-b border-paper-edge px-5 py-4 sm:px-6">
        <p className="text-sm text-ink-soft">
          <span className="font-serif text-lg text-ink">{set.items.length}</span>{" "}
          {set.items.length === 1 ? "book" : "books"}
        </p>
        <span className="text-[0.7rem] font-medium uppercase tracking-[0.12em] text-ink-faint">
          Best match first
        </span>
      </div>
      <ol className="divide-y divide-paper-edge">
        {set.items.map((item) => (
          <BookRow key={item.title + item.author} item={item} />
        ))}
      </ol>
    </div>
  );
}

/** Canon gaps: one card per focus area (period/movement you're into). */
function CanonContent({ set }: { set: StoredSet<CanonFocus> }) {
  const total = set.items.reduce((n, area) => n + area.works.length, 0);
  return (
    <div className="space-y-6">
      <p className="text-sm text-ink-soft">
        <span className="font-serif text-lg text-ink">{total}</span>{" "}
        {total === 1 ? "work" : "works"} across{" "}
        <span className="font-serif text-lg text-ink">{set.items.length}</span>{" "}
        {set.items.length === 1 ? "area" : "areas"} you favour.
      </p>
      {set.items.map((area) => (
        <div
          key={area.focus}
          className="overflow-hidden rounded-2xl border border-paper-edge bg-paper shadow-card"
        >
          <div className="flex items-center justify-between border-b border-paper-edge px-5 py-4 sm:px-6">
            <h3 className="font-serif text-lg text-ink">{area.focus}</h3>
            <span className="text-[0.7rem] font-medium uppercase tracking-[0.12em] text-ink-faint">
              {area.works.length} {area.works.length === 1 ? "work" : "works"}
            </span>
          </div>
          <ol className="divide-y divide-paper-edge">
            {area.works.map((item) => (
              <BookRow key={item.title + item.author} item={item} />
            ))}
          </ol>
        </div>
      ))}
    </div>
  );
}

/** A recommended book, laid out like a front-page library row (no explanation). */
function BookRow({ item }: { item: Recommendation | CanonGap }) {
  const period = item.period ?? null;
  const color = periodColor(period);
  const importance = "importance" in item ? item.importance : null;
  const tag = item.primary_movement ?? shortPeriod(period);

  return (
    <li className="flex items-stretch gap-3 px-4 py-3 sm:px-5">
      {importance != null && <ScoreBadge value={importance} />}
      <div className="min-w-0 flex-1">
        <h3 className="truncate font-serif text-[0.95rem] font-bold leading-tight text-ink">
          {item.title}
        </h3>
        <p className="mt-0.5 truncate text-xs text-ink-soft">{item.author}</p>
        <p className="mt-1.5 flex items-center gap-1.5 text-[0.7rem] font-medium">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: color }} aria-hidden />
          <span className="truncate" style={{ color }}>{tag}</span>
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end justify-between">
        <span className="text-xs tabular-nums text-ink-faint">
          {formatYear(item.first_published ?? null)}
        </span>
      </div>
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
