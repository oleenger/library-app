// Edit an existing work and its read status. Owner-only via the global
// middleware gate; all taxonomy validation happens in lib/catalogue/edit.ts.

import { z } from "zod";
import { getWork } from "@/lib/books";
import { updateWork, setReadStatus, deleteWork } from "@/lib/catalogue/edit";

export const runtime = "nodejs";

const BodySchema = z.object({
  title: z.string().min(1),
  author: z.string().min(1),
  authorSort: z.string().nullish(),
  firstPublished: z.number().int().nullish(),
  originalLanguage: z.string().nullish(),
  period: z.string().nullish(),
  primaryMovement: z.string().nullish(),
  secondaryMovements: z.array(z.string()).nullish(),
  notes: z.string().nullish(),
  read: z.boolean(),
  dateRead: z.string().nullish(),
  rating: z.number().int().min(1).max(5).nullish(),
});

export async function PATCH(
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
  const b = parsed.data;

  try {
    await updateWork(id, {
      title: b.title,
      author: b.author,
      authorSort: b.authorSort,
      firstPublished: b.firstPublished ?? null,
      originalLanguage: b.originalLanguage,
      period: b.period,
      primaryMovement: b.primaryMovement,
      secondaryMovements: b.secondaryMovements ?? [],
      notes: b.notes,
    });
    await setReadStatus(
      id,
      { read: b.read, dateRead: b.dateRead, rating: b.rating },
      { title: b.title, author: b.author },
    );
  } catch (err) {
    console.error("[books/edit] failed:", err);
    return Response.json(
      { error: "update failed", detail: String(err) },
      { status: 400 },
    );
  }

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
    await deleteWork(id);
  } catch (err) {
    console.error("[books/delete] failed:", err);
    return Response.json(
      { error: "delete failed", detail: String(err) },
      { status: 400 },
    );
  }

  return Response.json({ ok: true, id });
}
