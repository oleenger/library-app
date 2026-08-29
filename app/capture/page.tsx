"use client";

import Link from "next/link";
import { useState } from "react";

// Photo intake workflow. Stage 1: capture -> downscale -> upload -> echo.
// The Extract / Review / Add steps are shown but not yet wired.

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

type Candidate = {
  title: string;
  author: string;
  first_published?: number | null;
  period?: string | null;
  primary_movement?: string | null;
  confidence: number;
  unreadable?: boolean | null;
};

type Shot = {
  url: string;
  originalBytes: number;
  scaledBytes: number;
  status: "uploading" | "ok" | "error";
  candidates?: Candidate[];
  error?: string;
};

const STEPS = ["Capture", "Extract", "Review", "Add"] as const;

export default function CapturePage() {
  const [shots, setShots] = useState<Shot[]>([]);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = ""; // allow re-picking the same file
    for (const file of files) {
      if (!file.type.startsWith("image/")) continue;

      // Show the card immediately so there is always visible feedback, even if
      // downscaling or the request fails.
      const url = URL.createObjectURL(file);
      let index = 0;
      setShots((prev) => {
        index = prev.length;
        return [
          ...prev,
          { url, originalBytes: file.size, scaledBytes: file.size, status: "uploading" },
        ];
      });

      try {
        const scaled = await downscale(file);
        setShots((prev) =>
          prev.map((s, i) => (i === index ? { ...s, scaledBytes: scaled.size } : s)),
        );

        const body = new FormData();
        body.append("photo", scaled, "shot.jpg");
        const res = await fetch("/api/intake/extract", { method: "POST", body });
        const json = await res.json();
        setShots((prev) =>
          prev.map((s, i) =>
            i === index
              ? res.ok
                ? { ...s, status: "ok", candidates: json.candidates ?? [] }
                : {
                    ...s,
                    status: "error",
                    error: json.error
                      ? `${json.error}${json.missing ? `: ${json.missing.join(", ")}` : ""}`
                      : `HTTP ${res.status}`,
                  }
              : s,
          ),
        );
      } catch (err) {
        setShots((prev) =>
          prev.map((s, i) => (i === index ? { ...s, status: "error", error: String(err) } : s)),
        );
      }
    }
  }

  const kb = (n: number) => `${Math.round(n / 1024)} KB`;
  const uploaded = shots.filter((s) => s.status === "ok").length;
  const totalBooks = shots.reduce((n, s) => n + (s.candidates?.length ?? 0), 0);
  const currentStep = shots.length === 0 ? 0 : 1;

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

        {/* Capture dropzone */}
        <label
          className="group mt-8 block cursor-pointer rounded-2xl border-2 border-dashed border-paper-edge bg-paper-raised p-8 text-center shadow-card transition hover:border-accent-ring hover:bg-paper sm:p-12"
        >
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
            One shelf per shot works best. You can add several.
          </p>
        </label>

        {/* Session */}
        {shots.length > 0 && (
          <section className="mt-10">
            <div className="flex items-baseline justify-between">
              <h2 className="font-serif text-xl text-ink">This session</h2>
              <p className="text-[0.8rem] text-ink-faint">
                {uploaded} of {shots.length} uploaded
              </p>
            </div>

            <ul className="mt-4 grid gap-4 lg:grid-cols-2">
              {shots.map((s, i) => (
                <li
                  key={i}
                  className="rounded-2xl border border-paper-edge bg-paper p-3 shadow-card"
                >
                  <div className="flex gap-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={s.url}
                      alt={`Shelf photo ${i + 1}`}
                      className="h-24 w-24 flex-none rounded-xl object-cover shadow-cover"
                    />
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
      </main>

      {/* Sticky next-step bar */}
      {shots.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-paper-edge bg-canvas/85 backdrop-blur-md">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
            <p className="text-[0.85rem] text-ink-soft">
              <span className="font-semibold text-ink">{totalBooks}</span> book
              {totalBooks === 1 ? "" : "s"} found across{" "}
              <span className="font-semibold text-ink">{uploaded}</span> photo
              {uploaded === 1 ? "" : "s"}
            </p>
            <button
              type="button"
              disabled={totalBooks === 0}
              title="Review is the next stage"
              className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-[0.85rem] font-semibold text-white shadow-sm transition enabled:hover:bg-ink disabled:cursor-not-allowed disabled:opacity-40"
            >
              Review {totalBooks > 0 ? totalBooks : ""} book{totalBooks === 1 ? "" : "s"}
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
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
