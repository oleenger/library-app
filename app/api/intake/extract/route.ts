// Stage 2: real extraction. Accept a downscaled photo, send it to a vision-
// capable Claude model with the extract_books tool, validate the tool result
// with Zod, and return candidates. API key stays server-side (proposal §11).

import Anthropic from "@anthropic-ai/sdk";
import { getIntakeEnv } from "@/lib/env";
import { EXTRACT_BOOKS_TOOL, parseExtraction } from "@/lib/intake/schema";
import { buildExtractionPrompt } from "@/lib/intake/skill";

export const runtime = "nodejs";
// Vision extraction can take tens of seconds; give the function room so Vercel
// doesn't cut the connection mid-call (which the client sees as "Failed to fetch").
export const maxDuration = 60;

const MAX_BYTES = 12 * 1024 * 1024; // 12 MB cap per photo

export async function POST(req: Request) {
  const cfg = getIntakeEnv();
  if (!cfg.ok) {
    return Response.json(
      {
        error: "intake not configured",
        missing: cfg.missing,
        hint: "Set these in .env.local and restart the dev server.",
      },
      { status: 501 },
    );
  }

  const form = await req.formData();
  const file = form.get("photo");
  if (!(file instanceof File)) {
    return Response.json({ error: "no photo field" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return Response.json(
      { error: `photo too large (${file.size} bytes, max ${MAX_BYTES})` },
      { status: 413 },
    );
  }

  const mediaType = file.type === "image/png" ? "image/png" : "image/jpeg";
  const b64 = Buffer.from(await file.arrayBuffer()).toString("base64");

  const client = new Anthropic({ apiKey: cfg.env.apiKey });

  let msg;
  try {
    msg = await client.messages.create({
      model: cfg.env.model,
      max_tokens: 4096,
      tools: [EXTRACT_BOOKS_TOOL as unknown as Anthropic.Tool],
      tool_choice: { type: "tool", name: "extract_books" },
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: b64 } },
            { type: "text", text: buildExtractionPrompt() },
          ],
        },
      ],
    });
  } catch (err) {
    return Response.json(
      { error: "extraction call failed", detail: String(err) },
      { status: 502 },
    );
  }

  const toolUse = msg.content.find((c) => c.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    return Response.json({ error: "model returned no tool call" }, { status: 502 });
  }

  // Best-effort parse: one off-taxonomy field must not discard the whole photo.
  let result;
  try {
    result = parseExtraction(toolUse.input);
  } catch (err) {
    console.error("[intake/extract] unusable tool output:", err, JSON.stringify(toolUse.input));
    return Response.json(
      { error: "extraction failed validation", detail: String(err) },
      { status: 502 },
    );
  }

  if (result.dropped.length > 0) {
    console.warn("[intake/extract] coerced fields:", result.dropped);
  }
  if (result.candidates.length === 0) {
    return Response.json(
      { error: "no readable books found in photo", dropped: result.dropped },
      { status: 422 },
    );
  }

  return Response.json({
    candidates: result.candidates,
    dropped: result.dropped,
    usage: {
      input_tokens: msg.usage.input_tokens,
      output_tokens: msg.usage.output_tokens,
    },
  });
}
