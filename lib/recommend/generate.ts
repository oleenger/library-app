// The recommendation LLM call: send the reading-history prompt to Opus with the
// recommend_books tool, validate the tool result with Zod, and return typed
// recommendations. Pure I/O — all guarding (cache, cooldown, single-flight)
// lives in the route so this stays a thin, testable wrapper.

import Anthropic from "@anthropic-ai/sdk";
import type { IntakeEnv } from "../env";
import type { Work } from "../types";
import { buildCanonPrompt, buildRecommendPrompt } from "./prompt";
import { ownedKeySet, workKey } from "./match";
import {
  CANON_GAPS_TOOL,
  CanonResultSchema,
  RECOMMEND_BOOKS_TOOL,
  RecommendResultSchema,
  type CanonFocus,
  type Recommendation,
} from "./schema";

export interface GenerateResult {
  items: Recommendation[];
  basedOn: number;
  usage: { input_tokens: number; output_tokens: number };
}

// A touch of variety without going incoherent. The taste call benefits from some
// spread (obvious picks every time is exactly the "boring" failure mode); the
// canon call is a more deterministic audit, so it runs a shade cooler.
const TASTE_TEMPERATURE = 0.8;
const CANON_TEMPERATURE = 0.5;

/**
 * A forced tool call that hits the token ceiling returns truncated (invalid)
 * JSON, which would otherwise surface as a baffling Zod "validation failed".
 * Detect it early and report the real cause so the fix (raise max_tokens) is
 * obvious.
 */
function assertNotTruncated(stopReason: string | null, label: string): void {
  if (stopReason === "max_tokens") {
    throw new Error(`${label} truncated: hit max_tokens. Raise the token budget.`);
  }
}

export async function generateRecommendations(
  env: IntakeEnv,
  works: Work[],
): Promise<GenerateResult> {
  const { system, text, basedOn } = buildRecommendPrompt(works);
  const client = new Anthropic({ apiKey: env.apiKey });

  const msg = await client.messages.create({
    model: env.model,
    max_tokens: 3072,
    temperature: TASTE_TEMPERATURE,
    system,
    tools: [RECOMMEND_BOOKS_TOOL],
    tool_choice: { type: "tool", name: "recommend_books" },
    messages: [{ role: "user", content: [{ type: "text", text }] }],
  });

  assertNotTruncated(msg.stop_reason, "recommendation");

  const toolUse = msg.content.find((c) => c.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("model returned no tool call");
  }

  const parsed = RecommendResultSchema.safeParse(toolUse.input);
  if (!parsed.success) {
    throw new Error(`recommendation failed validation: ${parsed.error.message}`);
  }

  // Code-side guarantee: drop anything the reader already owns. The prompt asks
  // the model not to, but we no longer feed it the full library, so this is the
  // real guard against recommending a book back to its owner.
  const owned = ownedKeySet(works);
  const items = parsed.data.recommendations.filter(
    (r) => !owned.has(workKey(r.title, r.author)),
  );

  return {
    items,
    basedOn,
    usage: {
      input_tokens: msg.usage.input_tokens,
      output_tokens: msg.usage.output_tokens,
    },
  };
}

export interface CanonResult {
  items: CanonFocus[];
  basedOn: number;
  usage: { input_tokens: number; output_tokens: number };
}

export async function generateCanonGaps(
  env: IntakeEnv,
  works: Work[],
): Promise<CanonResult> {
  const { system, text, basedOn } = buildCanonPrompt(works);
  const client = new Anthropic({ apiKey: env.apiKey });

  const msg = await client.messages.create({
    model: env.model,
    max_tokens: 8192,
    temperature: CANON_TEMPERATURE,
    system,
    tools: [CANON_GAPS_TOOL],
    tool_choice: { type: "tool", name: "identify_canon_gaps" },
    messages: [{ role: "user", content: [{ type: "text", text }] }],
  });

  assertNotTruncated(msg.stop_reason, "canon gaps");

  const toolUse = msg.content.find((c) => c.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("model returned no tool call");
  }

  const parsed = CanonResultSchema.safeParse(toolUse.input);
  if (!parsed.success) {
    throw new Error(`canon gaps failed validation: ${parsed.error.message}`);
  }

  // Order each area as a reading path: by the model's `order` where present,
  // falling back to importance (strongest first) for any work it left unordered
  // or for legacy sets generated before ordering existed. Owned works are kept —
  // they are the path's waypoints; the view does the live owned/gap join.
  const items: CanonFocus[] = parsed.data.focus_areas
    .map((area) => ({
      ...area,
      works: [...area.works].sort((a, b) => {
        const oa = a.order ?? null;
        const ob = b.order ?? null;
        if (oa != null && ob != null && oa !== ob) return oa - ob;
        if (oa != null && ob == null) return -1;
        if (oa == null && ob != null) return 1;
        return b.importance - a.importance;
      }),
    }))
    .filter((area) => area.works.length > 0);

  return {
    items,
    basedOn,
    usage: {
      input_tokens: msg.usage.input_tokens,
      output_tokens: msg.usage.output_tokens,
    },
  };
}
