// The recommendation LLM call: send the reading-history prompt to Opus with the
// recommend_books tool, validate the tool result with Zod, and return typed
// recommendations. Pure I/O — all guarding (cache, cooldown, single-flight)
// lives in the route so this stays a thin, testable wrapper.

import Anthropic from "@anthropic-ai/sdk";
import type { IntakeEnv } from "../env";
import type { Work } from "../types";
import { buildCanonPrompt, buildRecommendPrompt } from "./prompt";
import {
  CANON_GAPS_TOOL,
  CanonResultSchema,
  RECOMMEND_BOOKS_TOOL,
  RecommendResultSchema,
  type CanonGap,
  type Recommendation,
} from "./schema";

export interface GenerateResult {
  items: Recommendation[];
  basedOn: number;
  usage: { input_tokens: number; output_tokens: number };
}

export async function generateRecommendations(
  env: IntakeEnv,
  works: Work[],
): Promise<GenerateResult> {
  const { text, basedOn } = buildRecommendPrompt(works);
  const client = new Anthropic({ apiKey: env.apiKey });

  const msg = await client.messages.create({
    model: env.model,
    max_tokens: 2048,
    tools: [RECOMMEND_BOOKS_TOOL],
    tool_choice: { type: "tool", name: "recommend_books" },
    messages: [{ role: "user", content: [{ type: "text", text }] }],
  });

  const toolUse = msg.content.find((c) => c.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("model returned no tool call");
  }

  const parsed = RecommendResultSchema.safeParse(toolUse.input);
  if (!parsed.success) {
    throw new Error(`recommendation failed validation: ${parsed.error.message}`);
  }

  return {
    items: parsed.data.recommendations,
    basedOn,
    usage: {
      input_tokens: msg.usage.input_tokens,
      output_tokens: msg.usage.output_tokens,
    },
  };
}

export interface CanonResult {
  items: CanonGap[];
  basedOn: number;
  usage: { input_tokens: number; output_tokens: number };
}

export async function generateCanonGaps(
  env: IntakeEnv,
  works: Work[],
): Promise<CanonResult> {
  const { text, basedOn } = buildCanonPrompt(works);
  const client = new Anthropic({ apiKey: env.apiKey });

  const msg = await client.messages.create({
    model: env.model,
    max_tokens: 3072,
    tools: [CANON_GAPS_TOOL],
    tool_choice: { type: "tool", name: "identify_canon_gaps" },
    messages: [{ role: "user", content: [{ type: "text", text }] }],
  });

  const toolUse = msg.content.find((c) => c.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("model returned no tool call");
  }

  const parsed = CanonResultSchema.safeParse(toolUse.input);
  if (!parsed.success) {
    throw new Error(`canon gaps failed validation: ${parsed.error.message}`);
  }

  // Strongest gaps first.
  const items = [...parsed.data.gaps].sort((a, b) => b.importance - a.importance);

  return {
    items,
    basedOn,
    usage: {
      input_tokens: msg.usage.input_tokens,
      output_tokens: msg.usage.output_tokens,
    },
  };
}
