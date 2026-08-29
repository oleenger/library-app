// Server-side environment config for photo intake. Keep secrets and model ids
// here so routes never read process.env directly (proposal §9.2, §11).
//
// Set these in .env.local (gitignored):
//   ANTHROPIC_API_KEY=sk-ant-...
//   INTAKE_MODEL=claude-sonnet-4-5      # a vision-capable Claude model id

export type IntakeEnv = {
  apiKey: string;
  model: string;
};

/**
 * Returns intake env, or a list of missing keys. Never throws — the route turns
 * a missing config into a clean 501 with guidance rather than a 500 stack trace.
 */
export function getIntakeEnv():
  | { ok: true; env: IntakeEnv }
  | { ok: false; missing: string[] } {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim() ?? "";
  const model = process.env.INTAKE_MODEL?.trim() ?? "";
  const missing: string[] = [];
  if (!apiKey) missing.push("ANTHROPIC_API_KEY");
  if (!model) missing.push("INTAKE_MODEL");
  if (missing.length > 0) return { ok: false, missing };
  return { ok: true, env: { apiKey, model } };
}

// Reading-import matching is a text-only, cross-language title-identity task —
// Sonnet handles it well at ~1/5 the cost of the Opus used for vision intake, so
// it gets its own model knob. Falls back to INTAKE_MODEL, then a Sonnet default,
// so the feature works with zero extra configuration.
//   READING_MATCH_MODEL=claude-sonnet-4-5   # optional override
export function getReadingMatchEnv():
  | { ok: true; env: IntakeEnv }
  | { ok: false; missing: string[] } {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim() ?? "";
  if (!apiKey) return { ok: false, missing: ["ANTHROPIC_API_KEY"] };
  const model =
    process.env.READING_MATCH_MODEL?.trim() ||
    process.env.INTAKE_MODEL?.trim() ||
    "claude-sonnet-4-5";
  return { ok: true, env: { apiKey, model } };
}

// Recommendations are a reasoning-heavy, taste-sensitive task over the whole
// reading history, so they run on Opus by default. The call is rare (guarded by
// a fingerprint cache + cooldown in the route), so the cost is bounded.
//   RECOMMEND_MODEL=claude-opus-4-8   # optional override
export function getRecommendEnv():
  | { ok: true; env: IntakeEnv }
  | { ok: false; missing: string[] } {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim() ?? "";
  if (!apiKey) return { ok: false, missing: ["ANTHROPIC_API_KEY"] };
  const model =
    process.env.RECOMMEND_MODEL?.trim() ||
    process.env.INTAKE_MODEL?.trim() ||
    "claude-opus-4-8";
  return { ok: true, env: { apiKey, model } };
}
