"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { MOVEMENTS, PERIODS } from "@/lib/taxonomy";
import { useOnline } from "@/lib/offline/use-online";

// Photo intake workflow: capture -> extract -> review -> add.
// Capture/extract happen per shot; review aggregates every read book into one
// editable queue; add commits the kept books to the library.
//
// Session state is mirrored to sessionStorage so it survives a tab reload:
// Android Chrome can discard and reload the page when the OS camera launches
// (memory pressure), which would otherwise wipe every read book. We also keep
// only tiny thumbnail data URLs in memory (not the multi-MB originals) to make
// that discard far less likely in the first place.

// Longest edge to downscale to before upload. 1600px keeps spine text legible
// (proposal §9.1) while cutting a multi-MB photo to a few hundred KB. Bump this
// if identification quality suffers once the LLM stage is in.
const MAX_EDGE = 1600;

// Downscale a photo before upload. Tries OffscreenCanvas, falls back to a normal
// <canvas> (older iOS Safari lacks OffscreenCanvas.convertToBlob), and if both
// fail returns the original file so the upload still happens.
async function downscale(file: File, maxEdge = MAX_EDGE): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(file);
    const w = Math.round(bmp.width * Math.min(1, maxEdge / Math.max(bmp.width, bmp.height)));
    const h = Math.round(bmp.height * Math.min(1, maxEdge / Math.max(bmp.width, bmp.height)));

    // Preferred: OffscreenCanvas.
    if (typeof OffscreenCanvas !== "undefined") {
      try {
        const oc = new OffscreenCanvas(w, h);
        oc.getContext("2d")!.drawImage(bmp, 0, 0, w, h);
        const blob = await oc.convertToBlob({ type: "image/jpeg", quality: 0.85 });
        bmp.close();
        return blob;
      } catch {
        // fall through to <canvas>
      }
    }

    // Fallback: HTMLCanvasElement.toBlob.
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, w, h);
    bmp.close();
    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.85),
    );
    if (blob) return blob;
  } catch {
    // ignore and use original
  }
  return file; // last resort: upload full-size
}

// Render a small, self-contained thumbnail (data URL) from a blob. Unlike an
// object URL this survives a tab reload once persisted, and it lets us revoke
// the full-size original so it stops occupying memory.
async function thumbnailDataUrl(blob: Blob, maxEdge = 240): Promise<string> {
  try {
    const bmp = await createImageBitmap(blob);
    const scale = Math.min(1, maxEdge / Math.max(bmp.width, bmp.height));
    const w = Math.round(bmp.width * scale);
    const h = Math.round(bmp.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, w, h);
    bmp.close();
    return canvas.toDataURL("image/jpeg", 0.7);
  } catch {
    return "";
  }
}

// POST with a hard timeout so a hung request surfaces a clear message instead of
// spinning forever. Aborts after `ms` and rethrows as an AbortError.
async function postWithTimeout(
  url: string,
  init: RequestInit,
  ms: number,
): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

// Turn a failed request into a short, human message. Distinguishes a timeout and
// a network-layer failure ("Failed to fetch") from everything else.
function describeFetchError(err: unknown): string {
  if (err instanceof DOMException && err.name === "AbortError") {
    return "Timed out — the network dropped or the server took too long. Try again.";
  }
  if (err instanceof TypeError) {
    return "Network error — couldn't reach the server. Check your connection and retry.";
  }
  return String(err);
}

// Read an error response without assuming JSON: a platform 5xx page is HTML, and
// calling res.json() on it throws, masking the real status.
async function readErrorBody(res: Response): Promise<string> {
  const text = await res.text().catch(() => "");
  try {
    const j = JSON.parse(text) as { error?: string; detail?: unknown; missing?: string[] };
    if (j.error) {
      const extra = j.detail
        ? `: ${String(j.detail).slice(0, 140)}`
        : j.missing
          ? `: ${j.missing.join(", ")}`
          : "";
      return `${j.error}${extra}`;
    }
  } catch {
    // not JSON — fall through to the status line
  }
  return `HTTP ${res.status}`;
}

// Full candidate shape returned by the extract route. Everything except
// confidence/unreadable maps onto a master-CSV column.
type VerifyInfo = {
  status: "verified" | "corrected" | "unverified";
  match: {
    title: string;
    author: string;
    first_published: number | null;
    key: string | null;
  } | null;
};

type Candidate = {
  title: string;
  author: string;
  first_published?: number | null;
  original_language?: string | null;
  edition_language?: string | null;
  publisher?: string | null;
  edition?: string | null;
  period?: string | null;
  primary_movement?: string | null;
  secondary_movements?: string[] | null;
  confidence: number;
  unreadable?: boolean | null;
  notes?: string | null;
  // Attached by the extract route from OpenLibrary; UI-only, stripped on commit.
  _verify?: VerifyInfo;
};

type Shot = {
  id: string;
  url: string; // object URL while capturing, swapped to a data-URL thumbnail after downscale
  originalBytes: number;
  scaledBytes: number;
  status: "uploading" | "ok" | "error";
  candidates?: Candidate[];
  error?: string;
};

// A candidate promoted into the review queue: original fields + edit state.
type ReviewItem = Candidate & { id: string; keep: boolean };

type CommitResult = {
  added: number;
  duplicates: { title: string; author: string }[];
  rejected: { index: number; issues: unknown }[];
};

const STEPS = ["Capture", "Extract", "Review", "Add"] as const;

// sessionStorage key. Bump the suffix if the persisted shape changes.
const SESSION_KEY = "intake-session-v1";

type PersistedState = {
  shots: Shot[];
  mode: "capture" | "review" | "done";
  items: ReviewItem[];
  result: CommitResult | null;
};

// Shots that are safe to restore: finished (in-flight uploads can't be resumed).
// Object URLs are dead after a reload, so anything that isn't a self-contained
// data-URL thumbnail is blanked — the books still survive, just without a photo.
function persistableShots(shots: Shot[]): Shot[] {
  return shots
    .filter((s) => s.status !== "uploading")
    .map((s) => (s.url.startsWith("data:") ? s : { ...s, url: "" }));
}

function loadSession(): PersistedState | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as PersistedState) : null;
  } catch {
    return null;
  }
}

function saveSession(state: PersistedState) {
  try {
    sessionStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ ...state, shots: persistableShots(state.shots) }),
    );
  } catch {
    // Storage full / unavailable — persistence is best-effort.
  }
}

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function CapturePage() {
  const online = useOnline();
  const [shots, setShots] = useState<Shot[]>([]);
  const [mode, setMode] = useState<"capture" | "review" | "done">("capture");
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [committing, setCommitting] = useState(false);
  const [result, setResult] = useState<CommitResult | null>(null);

  // Rehydrate a prior session (e.g. after Android Chrome reloaded the tab when
  // the camera launched) before we start persisting again.
  const hydrated = useRef(false);
  useEffect(() => {
    const saved = loadSession();
    if (saved) {
      setShots(saved.shots ?? []);
      setMode(saved.mode ?? "capture");
      setItems(saved.items ?? []);
      setResult(saved.result ?? null);
    }
    hydrated.current = true;
  }, []);

  // Mirror session state to storage on every change (best-effort).
  useEffect(() => {
    if (!hydrated.current) return;
    saveSession({ shots, mode, items, result });
  }, [shots, mode, items, result]);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = ""; // allow re-picking the same file
    for (const file of files) {
      // Android camera files sometimes report an empty MIME type; only reject
      // things that clearly aren't images (the input already filters to image/*).
      if (file.type && !file.type.startsWith("image/")) continue;

      // Show the card immediately so there is always visible feedback, even if
      // downscaling or the request fails. Each shot has a stable id so async
      // updates target the right card regardless of ordering.
      const id = newId();
      const objectUrl = URL.createObjectURL(file);
      setShots((prev) => [
        ...prev,
        { id, url: objectUrl, originalBytes: file.size, scaledBytes: file.size, status: "uploading" },
      ]);

      const patch = (fields: Partial<Shot>) =>
        setShots((prev) => prev.map((s) => (s.id === id ? { ...s, ...fields } : s)));

      try {
        const scaled = await downscale(file);

        // Swap the heavy full-size object URL for a light data-URL thumbnail and
        // free the original — this both persists across reloads and cuts memory.
        const thumb = await thumbnailDataUrl(scaled);
        if (thumb) {
          patch({ scaledBytes: scaled.size, url: thumb });
          URL.revokeObjectURL(objectUrl);
        } else {
          patch({ scaledBytes: scaled.size });
        }

        const body = new FormData();
        body.append("photo", scaled, "shot.jpg");
        const res = await postWithTimeout(
          "/api/intake/extract",
          { method: "POST", body },
          90_000,
        );
        if (res.ok) {
          const json = await res.json();
          patch({ status: "ok", candidates: json.candidates ?? [] });
        } else {
          patch({ status: "error", error: await readErrorBody(res) });
        }
      } catch (err) {
        patch({ status: "error", error: describeFetchError(err) });
      }
    }
  }

  const kb = (n: number) => `${Math.round(n / 1024)} KB`;
  const uploaded = shots.filter((s) => s.status === "ok").length;
  const totalBooks = shots.reduce((n, s) => n + (s.candidates?.length ?? 0), 0);
  const currentStep = mode === "done" ? 3 : mode === "review" ? 2 : shots.length === 0 ? 0 : 1;

  // Flatten every read book into one queue and switch to the review surface.
  // Order by attention needed: books with no database match (possible misreads)
  // and books with a suggested correction come first, then least-confident reads.
  function enterReview() {
    const queue: ReviewItem[] = [];
    shots.forEach((s, si) => {
      (s.candidates ?? []).forEach((c, ci) => {
        queue.push({ ...c, id: `${si}-${ci}`, keep: true });
      });
    });
    const rank = (it: ReviewItem) =>
      it._verify?.status === "unverified" ? 0 : it._verify?.status === "corrected" ? 1 : 2;
    queue.sort((a, b) => rank(a) - rank(b) || a.confidence - b.confidence);
    setItems(queue);
    setMode("review");
    window.scrollTo({ top: 0 });
  }

  function updateItem(id: string, patch: Partial<ReviewItem>) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }

  const kept = items.filter((it) => it.keep);

  async function commit() {
    setCommitting(true);
    try {
      const candidates = kept.map(({ id, keep, _verify, ...c }) => c); // strip UI fields
      const res = await postWithTimeout(
        "/api/intake/commit",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ candidates }),
        },
        45_000,
      );
      if (res.ok) {
        const json = await res.json();
        setResult(json as CommitResult);
        setMode("done");
        window.scrollTo({ top: 0 });
      } else {
        setResult({
          added: 0,
          duplicates: [],
          rejected: [{ index: -1, issues: await readErrorBody(res) }],
        });
        setMode("done");
      }
    } catch (err) {
      setResult({
        added: 0,
        duplicates: [],
        rejected: [{ index: -1, issues: describeFetchError(err) }],
      });
      setMode("done");
    } finally {
      setCommitting(false);
    }
  }

  function reset() {
    setShots([]);
    setItems([]);
    setResult(null);
    setMode("capture");
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      // ignore
    }
  }

  return (
    <div className="min-h-screen">
      {/* Header — mirrors the library header */}
      <header className="sticky top-0 z-30 border-b border-paper-edge bg-canvas/80 shadow-header backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3 text-ink">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-ink font-serif text-base italic text-canvas shadow-sm">
              L
            </span>
            <span className="text-[0.95rem] font-semibold tracking-tight">The Library</span>
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-xl border border-paper-edge bg-paper px-3 py-2 text-[0.8rem] font-medium text-ink-soft transition hover:text-ink"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M15 18l-6-6 6-6" />
            </svg>
            Library
          </Link>
        </div>
      </header>

      <main className="enter-up mx-auto max-w-5xl px-4 pb-32 pt-8 sm:px-6 lg:px-8">
        {/* Title */}
        <div className="max-w-2xl">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-accent">
            Photo intake
          </p>
          <h1 className="mt-2 font-serif text-3xl leading-tight text-ink sm:text-4xl">
            Add books by photographing your shelves
          </h1>
          <p className="mt-3 text-[0.95rem] leading-relaxed text-ink-soft">
            Point the camera at a shelf and capture it. Each photo is read for the
            books on it, so you can review and add them in one pass — far faster than
            scanning barcodes one at a time.
          </p>
        </div>

        {!online && (
          <div className="mt-6 flex items-start gap-3 rounded-xl border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-amber-500" aria-hidden />
            <p>
              <span className="font-semibold">You&apos;re offline.</span> Adding
              books needs a connection — photos are read and saved on the server.
              You can still browse your library; come back online to add books.
            </p>
          </div>
        )}

        {/* Workflow stepper */}
        <ol className="mt-8 flex flex-wrap items-center gap-x-2 gap-y-3">
          {STEPS.map((label, i) => {
            const state = i < currentStep ? "done" : i === currentStep ? "current" : "todo";
            return (
              <li key={label} className="flex items-center gap-2">
                <span
                  className={[
                    "grid h-6 w-6 place-items-center rounded-full text-[0.7rem] font-semibold transition",
                    state === "done" && "bg-accent text-white",
                    state === "current" && "bg-ink text-canvas",
                    state === "todo" && "bg-paper-sunken text-ink-faint",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {i + 1}
                </span>
                <span
                  className={[
                    "text-[0.8rem] font-medium",
                    state === "todo" ? "text-ink-faint" : "text-ink",
                  ].join(" ")}
                >
                  {label}
                </span>
                {i < STEPS.length - 1 && (
                  <span className="mx-1 h-px w-6 bg-paper-edge sm:w-10" aria-hidden />
                )}
              </li>
            );
          })}
        </ol>

        {mode === "capture" && (
          <CaptureStage
            shots={shots}
            onPick={onPick}
            onReset={reset}
            uploaded={uploaded}
            kb={kb}
          />
        )}

        {mode === "review" && (
          <ReviewStage items={items} updateItem={updateItem} onBack={() => setMode("capture")} />
        )}

        {mode === "done" && result && (
          <DoneStage result={result} onReset={reset} />
        )}
      </main>

      {/* Sticky action bar */}
      {mode === "capture" && shots.length > 0 && (
        <ActionBar>
          <p className="text-[0.85rem] text-ink-soft">
            <span className="font-semibold text-ink">{totalBooks}</span> book
            {totalBooks === 1 ? "" : "s"} found across{" "}
            <span className="font-semibold text-ink">{uploaded}</span> photo
            {uploaded === 1 ? "" : "s"}
          </p>
          <button
            type="button"
            disabled={totalBooks === 0}
            onClick={enterReview}
            className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-[0.85rem] font-semibold text-white shadow-sm transition enabled:hover:bg-ink disabled:cursor-not-allowed disabled:opacity-40"
          >
            Review {totalBooks > 0 ? totalBooks : ""} book{totalBooks === 1 ? "" : "s"}
            <ArrowRight />
          </button>
        </ActionBar>
      )}

      {mode === "review" && (
        <ActionBar>
          <p className="text-[0.85rem] text-ink-soft">
            <span className="font-semibold text-ink">{kept.length}</span> of {items.length}{" "}
            selected to add
          </p>
          <button
            type="button"
            disabled={kept.length === 0 || committing}
            onClick={commit}
            className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-[0.85rem] font-semibold text-white shadow-sm transition enabled:hover:bg-ink disabled:cursor-not-allowed disabled:opacity-40"
          >
            {committing ? "Adding…" : `Add ${kept.length} to library`}
            {!committing && <ArrowRight />}
          </button>
        </ActionBar>
      )}
    </div>
  );
}

// --- Capture stage --------------------------------------------------------

function CaptureStage({
  shots,
  onPick,
  onReset,
  uploaded,
  kb,
}: {
  shots: Shot[];
  onPick: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onReset: () => void;
  uploaded: number;
  kb: (n: number) => string;
}) {
  return (
    <>
      <label className="group mt-8 block cursor-pointer rounded-2xl border-2 border-dashed border-paper-edge bg-paper-raised p-8 text-center shadow-card transition hover:border-accent-ring hover:bg-paper sm:p-12">
        <input
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          onChange={onPick}
          className="sr-only"
        />
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-accent-soft text-accent transition group-hover:scale-105">
          <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M14.5 4h-5L8 6H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-4l-1.5-2Z" />
            <circle cx="12" cy="13" r="3.5" />
          </svg>
        </span>
        <p className="mt-4 font-serif text-lg text-ink">
          {shots.length === 0 ? "Open camera or choose photos" : "Add more photos"}
        </p>
        <p className="mt-1 text-[0.85rem] text-ink-faint">
          Get close and fill the frame with one shelf — small, distant spines
          can&apos;t be read reliably.
        </p>
      </label>

      {shots.length > 0 && (
        <section className="mt-10">
          <div className="flex items-baseline justify-between">
            <h2 className="font-serif text-xl text-ink">This session</h2>
            <div className="flex items-baseline gap-3">
              <p className="text-[0.8rem] text-ink-faint">
                {uploaded} of {shots.length} uploaded
              </p>
              <button
                type="button"
                onClick={onReset}
                className="text-[0.8rem] font-medium text-ink-soft underline-offset-2 transition hover:text-red-700 hover:underline"
              >
                Start over
              </button>
            </div>
          </div>

          <ul className="mt-4 grid gap-4 lg:grid-cols-2">
            {shots.map((s, i) => (
              <li key={s.id} className="rounded-2xl border border-paper-edge bg-paper p-3 shadow-card">
                <div className="flex gap-4">
                  {s.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={s.url}
                      alt={`Shelf photo ${i + 1}`}
                      className="h-24 w-24 flex-none rounded-xl object-cover shadow-cover"
                    />
                  ) : (
                    // Thumbnail didn't survive (restored session) — show a placeholder.
                    <span className="grid h-24 w-24 flex-none place-items-center rounded-xl bg-paper-sunken text-ink-faint shadow-cover">
                      <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
                      </svg>
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <StatusPill status={s.status} />
                      {s.status === "ok" && (
                        <span className="text-[0.75rem] font-medium text-ink-soft">
                          {s.candidates?.length ?? 0} book
                          {(s.candidates?.length ?? 0) === 1 ? "" : "s"}
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-[0.8rem] text-ink-soft">
                      {kb(s.originalBytes)} → <span className="font-medium text-ink">{kb(s.scaledBytes)}</span>
                    </p>
                    {s.status === "error" && (
                      <p className="mt-1 text-[0.72rem] text-red-700">{s.error}</p>
                    )}
                    {s.status === "uploading" && (
                      <p className="mt-1 text-[0.72rem] text-ink-faint">Reading spines…</p>
                    )}
                  </div>
                </div>

                {s.candidates && s.candidates.length > 0 && (
                  <ul className="mt-3 divide-y divide-paper-edge border-t border-paper-edge">
                    {[...s.candidates]
                      .sort((a, b) => a.confidence - b.confidence)
                      .map((c, j) => (
                        <li key={j} className="flex items-center gap-3 py-2">
                          <ConfidenceDot value={c.confidence} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[0.85rem] font-medium text-ink">
                              {c.title}
                              {c.unreadable && (
                                <span className="ml-1.5 text-[0.68rem] font-normal text-ink-faint">
                                  · partly hidden
                                </span>
                              )}
                            </p>
                            <p className="truncate text-[0.75rem] text-ink-soft">
                              {c.author}
                              {c.first_published ? ` · ${c.first_published}` : ""}
                              {c.period ? ` · ${c.period}` : ""}
                            </p>
                          </div>
                          <span className="flex-none text-[0.72rem] tabular-nums text-ink-faint">
                            {Math.round(c.confidence * 100)}%
                          </span>
                        </li>
                      ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

// --- Review stage ---------------------------------------------------------

function ReviewStage({
  items,
  updateItem,
  onBack,
}: {
  items: ReviewItem[];
  updateItem: (id: string, patch: Partial<ReviewItem>) => void;
  onBack: () => void;
}) {
  return (
    <section className="mt-8">
      <div className="flex items-baseline justify-between">
        <h2 className="font-serif text-xl text-ink">Review books</h2>
        <button
          type="button"
          onClick={onBack}
          className="text-[0.8rem] font-medium text-ink-soft transition hover:text-ink"
        >
          ← Back to photos
        </button>
      </div>
      <p className="mt-1 text-[0.85rem] text-ink-faint">
        Least-confident reads first. Fix anything misread, uncheck what
        shouldn&apos;t be added, then add the rest.
      </p>

      <ul className="mt-5 space-y-3">
        {items.map((it) => (
          <li
            key={it.id}
            className={[
              "rounded-2xl border p-4 shadow-card transition",
              it.keep ? "border-paper-edge bg-paper" : "border-paper-edge bg-paper-sunken opacity-60",
            ].join(" ")}
          >
            <div className="flex items-start gap-3">
              <label className="mt-1 flex-none cursor-pointer">
                <input
                  type="checkbox"
                  checked={it.keep}
                  onChange={(e) => updateItem(it.id, { keep: e.target.checked })}
                  className="h-4 w-4 accent-accent"
                />
              </label>

              <div className="min-w-0 flex-1 space-y-2.5">
                <div className="flex items-center gap-2">
                  <ConfidenceDot value={it.confidence} />
                  <span className="text-[0.72rem] tabular-nums text-ink-faint">
                    {Math.round(it.confidence * 100)}% confident
                  </span>
                  {it.unreadable && (
                    <span className="text-[0.68rem] text-amber-600">· partly hidden</span>
                  )}
                  <VerifyBadge status={it._verify?.status} />
                </div>

                {it._verify?.status === "corrected" && it._verify.match && (
                  <CorrectionSuggestion
                    read={{ title: it.title, author: it.author }}
                    match={it._verify.match}
                    onApply={() =>
                      updateItem(it.id, {
                        title: it._verify!.match!.title,
                        author: it._verify!.match!.author,
                        first_published:
                          it._verify!.match!.first_published ?? it.first_published ?? null,
                        _verify: { status: "verified", match: it._verify!.match },
                      })
                    }
                    onDismiss={() =>
                      updateItem(it.id, {
                        _verify: { status: "verified", match: it._verify!.match },
                      })
                    }
                  />
                )}

                <div className="grid gap-2.5 sm:grid-cols-2">
                  <Field label="Title">
                    <input
                      value={it.title}
                      onChange={(e) => updateItem(it.id, { title: e.target.value })}
                      className="review-input font-medium"
                    />
                  </Field>
                  <Field label="Author">
                    <input
                      value={it.author}
                      onChange={(e) => updateItem(it.id, { author: e.target.value })}
                      className="review-input"
                    />
                  </Field>
                  <Field label="First published">
                    <input
                      value={it.first_published ?? ""}
                      inputMode="numeric"
                      onChange={(e) => {
                        const n = e.target.value.trim();
                        updateItem(it.id, { first_published: n ? Number(n) : null });
                      }}
                      className="review-input"
                    />
                  </Field>
                  <Field label="Period">
                    <select
                      value={it.period ?? ""}
                      onChange={(e) => updateItem(it.id, { period: e.target.value || null })}
                      className="review-input"
                    >
                      <option value="">— none —</option>
                      {PERIODS.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Primary movement">
                    <select
                      value={it.primary_movement ?? ""}
                      onChange={(e) => updateItem(it.id, { primary_movement: e.target.value || null })}
                      className="review-input"
                    >
                      <option value="">— none —</option>
                      {MOVEMENTS.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </Field>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-ink-faint">
        {label}
      </span>
      {children}
    </label>
  );
}

// Small pill showing whether the read book matched a real OpenLibrary record.
function VerifyBadge({ status }: { status?: VerifyInfo["status"] }) {
  if (!status) return null;
  const map = {
    verified: { label: "✓ Verified", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    corrected: { label: "≈ Suggestion", cls: "bg-sky-50 text-sky-700 border-sky-200" },
    unverified: { label: "? Not found", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  } as const;
  const s = map[status];
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[0.62rem] font-semibold ${s.cls}`}>
      {s.label}
    </span>
  );
}

// Inline "Read X → Match Y" prompt shown when OpenLibrary returns a canonical
// record that differs from the transcribed spine. The human accepts or dismisses.
function CorrectionSuggestion({
  read,
  match,
  onApply,
  onDismiss,
}: {
  read: { title: string; author: string };
  match: NonNullable<VerifyInfo["match"]>;
  onApply: () => void;
  onDismiss: () => void;
}) {
  const titleDiffers = read.title.trim().toLowerCase() !== match.title.trim().toLowerCase();
  const authorDiffers = read.author.trim().toLowerCase() !== match.author.trim().toLowerCase();
  return (
    <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-3 text-[0.8rem]">
      <p className="font-semibold text-sky-800">Did you mean this book?</p>
      <div className="mt-1.5 space-y-0.5 text-ink-soft">
        {titleDiffers && (
          <p>
            <span className="text-ink-faint">Title </span>
            <span className="line-through decoration-ink-faint/50">{read.title}</span>
            {" → "}
            <span className="font-medium text-ink">{match.title}</span>
          </p>
        )}
        {authorDiffers && (
          <p>
            <span className="text-ink-faint">Author </span>
            <span className="line-through decoration-ink-faint/50">{read.author}</span>
            {" → "}
            <span className="font-medium text-ink">{match.author}</span>
          </p>
        )}
        {match.first_published != null && (
          <p className="text-ink-faint">First published {match.first_published}</p>
        )}
      </div>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={onApply}
          className="rounded-lg bg-sky-600 px-2.5 py-1 text-[0.72rem] font-semibold text-white transition hover:bg-sky-700"
        >
          Apply correction
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-lg border border-paper-edge px-2.5 py-1 text-[0.72rem] font-medium text-ink-soft transition hover:text-ink"
        >
          Keep as read
        </button>
      </div>
    </div>
  );
}

// --- Done stage -----------------------------------------------------------

function DoneStage({ result, onReset }: { result: CommitResult; onReset: () => void }) {
  const dupes = result.duplicates.length;
  const rejects = result.rejected.length;
  return (
    <section className="mt-10 rounded-2xl border border-paper-edge bg-paper p-8 text-center shadow-card">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-accent-soft text-accent">
        <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M20 6 9 17l-5-5" />
        </svg>
      </span>
      <h2 className="mt-4 font-serif text-2xl text-ink">
        {result.added} book{result.added === 1 ? "" : "s"} added to your library
      </h2>
      {(dupes > 0 || rejects > 0) && (
        <p className="mt-2 text-[0.9rem] text-ink-soft">
          {dupes > 0 && <>{dupes} already in the library</>}
          {dupes > 0 && rejects > 0 && " · "}
          {rejects > 0 && <>{rejects} couldn&apos;t be added</>}
        </p>
      )}

      {dupes > 0 && (
        <ul className="mx-auto mt-4 max-w-md space-y-1 text-left text-[0.8rem] text-ink-faint">
          {result.duplicates.map((d, i) => (
            <li key={i} className="truncate">· {d.title} — {d.author}</li>
          ))}
        </ul>
      )}

      <div className="mt-6 flex items-center justify-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-[0.85rem] font-semibold text-white shadow-sm transition hover:bg-ink"
        >
          View library
          <ArrowRight />
        </Link>
        <button
          type="button"
          onClick={onReset}
          className="rounded-xl border border-paper-edge bg-paper px-4 py-2.5 text-[0.85rem] font-medium text-ink-soft transition hover:text-ink"
        >
          Add more
        </button>
      </div>
    </section>
  );
}

// --- Shared bits ----------------------------------------------------------

function ActionBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-paper-edge bg-canvas/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        {children}
      </div>
    </div>
  );
}

function ArrowRight() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function ConfidenceDot({ value }: { value: number }) {
  const cls =
    value >= 0.8 ? "bg-accent" : value >= 0.5 ? "bg-amber-500" : "bg-red-500";
  return (
    <span
      className={`h-2 w-2 flex-none rounded-full ${cls}`}
      title={`${Math.round(value * 100)}% confidence`}
      aria-hidden
    />
  );
}

function StatusPill({ status }: { status: Shot["status"] }) {
  const map = {
    uploading: { label: "Reading…", cls: "bg-paper-sunken text-ink-soft" },
    ok: { label: "Read", cls: "bg-accent-soft text-accent" },
    error: { label: "Failed", cls: "bg-red-100 text-red-700" },
  } as const;
  const { label, cls } = map[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.7rem] font-semibold ${cls}`}>
      {status === "uploading" && (
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
      )}
      {label}
    </span>
  );
}
