// Link this work's edition(s) onto an existing canonical work — the first-class
// "this foreign copy is really an edition of that book" action. Owner-only via
// the global middleware gate. The source work ([id]) is consumed into the target.

import { z } from "zod";
import { revalidateTag } from "next/cache";
import { getWork } from "@/lib/books";
import { linkWorkAsEdition } from "@/lib/catalogue/edit";
import { CATALOGUE_TAG } from "@/lib/cache-tags";

export const runtime = "nodejs";

const BodySchema = z.object({ targetId: z.string().min(1) });

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const source = await getWork(id);
  if (!source) return Response.json({ error: "not found" }, { status: 404 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "invalid body", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const target = await getWork(parsed.data.targetId);
  if (!target) return Response.json({ error: "target not found" }, { status: 404 });

  let result: { id: string };
  try {
    result = await linkWorkAsEdition(id, parsed.data.targetId);
  } catch (err) {
    console.error("[books/link-edition] failed:", err);
    return Response.json(
      { error: "link failed", detail: String(err) },
      { status: 400 },
    );
  }

  revalidateTag(CATALOGUE_TAG);
  return Response.json({ ok: true, id: result.id });
}
