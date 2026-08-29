// POST /api/recommendations?kind=taste|canon — generate recommendations.
//
//   taste — books to read next, from reading history.
//   canon — major/canonical works the library lacks, scored by importance.
//
// This endpoint is deliberately hard to abuse. Each kind's result is a pure
// function of a source fingerprint (reading history for taste, library coverage
// for canon), so we defend the expensive LLM call with four layers, per kind:
//
//   1. Content-addressed cache. If the current fingerprint matches the cached
//      one we return the cache and NEVER call the model. Refreshing the page or
//      re-POSTing an unchanged source therefore costs nothing.
//   2. Cooldown. A genuine cache-miss (or explicit refresh) is rate-limited to
//      one real generation per COOLDOWN_MS per kind; excess returns 429.
//   3. Single-flight. Concurrent requests for a kind coalesce onto one call.
//   4. Bounds. Preconditions + capped prompt + bounded max_tokens.
//
// The page (GET) reads the cache directly and never calls the model.
//
// Note: single-user personal app, so guards are global (no auth / per-IP). For a
// public deploy, key the cooldown/cache by user and add per-IP throttling here.

import { getRecommendEnv } from "@/lib/env";
import { getWorks } from "@/lib/books";
import { libraryFingerprint, readingFingerprint } from "@/lib/recommend/fingerprint";
import { generateCanonGaps, generateRecommendations } from "@/lib/recommend/generate";
import { readCache, writeSet, type RecKind, type StoredSet } from "@/lib/recommend/store";
import type { CanonGap, Recommendation } from "@/lib/recommend/schema";

export const runtime = "nodejs";

/** Minimum read works before taste recommendations are meaningful. */
const MIN_READS = 3;
/** Minimum owned works before a canon audit is meaningful. */
const MIN_WORKS = 5;
/** Minimum gap between genuine (cache-miss / refresh) generations, per kind. */
const COOLDOWN_MS = 60_000;

// Module-level guard state, per kind. Persists for the life of the server.
const lastGenerationAt: Record<RecKind, number> = { taste: 0, canon: 0 };
const inFlight: Record<RecKind, Promise<StoredSet<Recommendation | CanonGap>> | null> = {
  taste: null,
  canon: null,
};

export async function POST(req: Request) {
  const url = new URL(req.url);
  const kind = url.searchParams.get("kind") === "canon" ? "canon" : "taste";
  const refresh = url.searchParams.get("refresh") === "1";

  const cfg = getRecommendEnv();
  if (!cfg.ok) {
    return Response.json(
      {
        error: "recommendations not configured",
        missing: cfg.missing,
        hint: "Set ANTHROPIC_API_KEY in .env.local and restart the dev server.",
      },
      { status: 501 },
    );
  }

  const works = getWorks();

  // Preconditions + source fingerprint, per kind.
  let fingerprint: string;
  if (kind === "taste") {
    const readCount = works.filter((w) => w.reading).length;
    if (readCount < MIN_READS) {
      return Response.json(
        { error: "not enough reading history", hint: `Mark at least ${MIN_READS} books as read first.` },
        { status: 422 },
      );
    }
    fingerprint = readingFingerprint(works);
  } else {
    if (works.length < MIN_WORKS) {
      return Response.json(
        { error: "not enough books", hint: `Add at least ${MIN_WORKS} books first.` },
        { status: 422 },
      );
    }
    fingerprint = libraryFingerprint(works);
  }

  const cached = readCache()[kind];

  // Layer 1: content-addressed cache. Unchanged source => zero LLM calls.
  if (!refresh && cached && cached.fingerprint === fingerprint) {
    return Response.json({ kind, ...cached, cached: true });
  }

  // Layer 3: single-flight. Coalesce a concurrent burst onto one call.
  const pending = inFlight[kind];
  if (pending) {
    try {
      const result = await pending;
      return Response.json({ kind, ...result, cached: true, coalesced: true });
    } catch {
      // fall through and let this request attempt its own generation
    }
  }

  // Layer 2: cooldown. Bound how often a real generation can happen.
  const since = Date.now() - lastGenerationAt[kind];
  if (since < COOLDOWN_MS) {
    const retryAfter = Math.ceil((COOLDOWN_MS - since) / 1000);
    return Response.json(
      { error: "cooling down", retryAfter },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    );
  }

  // Timestamp up-front so a same-tick burst is throttled before the call returns.
  lastGenerationAt[kind] = Date.now();

  const run = (async (): Promise<StoredSet<Recommendation | CanonGap>> => {
    const result =
      kind === "taste"
        ? await generateRecommendations(cfg.env, works)
        : await generateCanonGaps(cfg.env, works);
    const set: StoredSet<Recommendation | CanonGap> = {
      fingerprint,
      generatedAt: new Date().toISOString(),
      model: cfg.env.model,
      basedOn: result.basedOn,
      items: result.items,
    };
    if (kind === "taste") writeSet("taste", set as StoredSet<Recommendation>);
    else writeSet("canon", set as StoredSet<CanonGap>);
    return set;
  })();
  inFlight[kind] = run;

  try {
    const set = await run;
    return Response.json({ kind, ...set, cached: false });
  } catch (err) {
    return Response.json(
      { error: "recommendation call failed", detail: String(err) },
      { status: 502 },
    );
  } finally {
    inFlight[kind] = null;
  }
}
