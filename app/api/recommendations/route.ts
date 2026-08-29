// POST /api/recommendations — generate book recommendations from reading history.
//
// This endpoint is deliberately hard to abuse. Recommendations are a pure
// function of the reading history, so we defend the (expensive) LLM call with
// four layers, in order:
//
//   1. Content-addressed cache. The result is keyed by a fingerprint of the
//      reading history. If the current fingerprint matches the cached one we
//      return the cache and NEVER call the model. Refreshing the page or
//      re-POSTing an unchanged library therefore costs nothing, forever.
//   2. Cooldown. A genuine cache-miss (or explicit refresh) is rate-limited to
//      one real generation per COOLDOWN_MS; excess returns 429 with retryAfter.
//   3. Single-flight. Concurrent requests coalesce onto one in-flight call, so
//      a parallel burst produces a single model invocation.
//   4. Bounds. Requires a minimum reading history; the prompt caps how much is
//      sent; max_tokens is bounded in generate.ts.
//
// The page itself (GET, app/recommendations/page.tsx) reads the cache directly
// and never calls the model. Generation only happens through this POST.
//
// Note: this is a single-user personal app, so the guards above are global (no
// auth / per-IP limiting). For a public multi-user deploy you would additionally
// key the cooldown and cache by user and add per-IP throttling here.

import { getRecommendEnv } from "@/lib/env";
import { getWorks } from "@/lib/books";
import { readingFingerprint } from "@/lib/recommend/fingerprint";
import { generateRecommendations } from "@/lib/recommend/generate";
import {
  readRecommendations,
  writeRecommendations,
  type RecommendationCache,
} from "@/lib/recommend/store";

export const runtime = "nodejs";

/** Minimum read works before recommendations are meaningful. */
const MIN_READS = 3;
/** Minimum gap between genuine (cache-miss / refresh) generations. */
const COOLDOWN_MS = 60_000;

// Module-level guard state. Persists for the life of the server process.
let lastGenerationAt = 0;
let inFlight: Promise<RecommendationCache> | null = null;

export async function POST(req: Request) {
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
  const readCount = works.filter((w) => w.reading).length;
  if (readCount < MIN_READS) {
    return Response.json(
      {
        error: "not enough reading history",
        hint: `Mark at least ${MIN_READS} books as read first.`,
        readCount,
      },
      { status: 422 },
    );
  }

  const fingerprint = readingFingerprint(works);
  const cached = readRecommendations();

  // Optional explicit refresh (still fully gated by cooldown + single-flight).
  const refresh = new URL(req.url).searchParams.get("refresh") === "1";

  // Layer 1: content-addressed cache. Unchanged history => zero LLM calls.
  if (!refresh && cached && cached.fingerprint === fingerprint) {
    return Response.json({ ...cached, cached: true });
  }

  // Layer 3: single-flight. Coalesce a concurrent burst onto one call.
  if (inFlight) {
    try {
      const result = await inFlight;
      return Response.json({ ...result, cached: true, coalesced: true });
    } catch {
      // fall through and let this request attempt its own generation
    }
  }

  // Layer 2: cooldown. Bound how often a real generation can happen.
  const since = Date.now() - lastGenerationAt;
  if (since < COOLDOWN_MS) {
    const retryAfter = Math.ceil((COOLDOWN_MS - since) / 1000);
    return Response.json(
      { error: "cooling down", retryAfter },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    );
  }

  // Set the timestamp up-front so a burst arriving in the same tick is throttled
  // even before the (awaited) model call returns.
  lastGenerationAt = Date.now();

  inFlight = (async () => {
    const result = await generateRecommendations(cfg.env, works);
    const record: RecommendationCache = {
      fingerprint,
      generatedAt: new Date().toISOString(),
      model: cfg.env.model,
      basedOn: result.basedOn,
      items: result.items,
    };
    writeRecommendations(record);
    return record;
  })();

  try {
    const record = await inFlight;
    return Response.json({ ...record, cached: false });
  } catch (err) {
    return Response.json(
      { error: "recommendation call failed", detail: String(err) },
      { status: 502 },
    );
  } finally {
    inFlight = null;
  }
}
