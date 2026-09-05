// Set or clear a work's canonical alias — the "this owned book IS that canon
// work" link initiated from a canon gap. Owner-only via the global middleware
// gate. PUT sets the alias (title+author); DELETE clears it.

import { z } from "zod";
import { revalidateTag } from "next/cache";
import { getWork } from "@/lib/books";
import { setCanonicalAlias } from "@/lib/catalogue/edit";
import { CATALOGUE_TAG } from "@/lib/cache-tags";

export const runtime = "nodejs";

const BodySchema = z.object({
  canonicalTitle: z.string().min(1),
  canonicalAuthor: z.string().min(1),
});

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const work = await getWork(id);
  if (!work) return Response.json({ error: "not found" }, { status: 404 });

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

  try {
    await setCanonicalAlias(id, parsed.data.canonicalTitle, parsed.data.canonicalAuthor);
  } catch (err) {
    console.error("[books/canonical] set failed:", err);
    return Response.json({ error: "link failed", detail: String(err) }, { status: 400 });
  }

  revalidateTag(CATALOGUE_TAG);
  return Response.json({ ok: true, id });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const work = await getWork(id);
  if (!work) return Response.json({ error: "not found" }, { status: 404 });

  try {
    await setCanonicalAlias(id, null, null);
  } catch (err) {
    console.error("[books/canonical] clear failed:", err);
    return Response.json({ error: "clear failed", detail: String(err) }, { status: 400 });
  }

  revalidateTag(CATALOGUE_TAG);
  return Response.json({ ok: true, id });
}
