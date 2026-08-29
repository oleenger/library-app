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
