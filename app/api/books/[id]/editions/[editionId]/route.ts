// Remove a single edition from a work. Owner-only via the global middleware
// gate. Deletes just the (work, edition) link and sweeps the edition row if it
// becomes orphaned — the work and its read status are left intact.

import { getWork } from "@/lib/books";
import { deleteEditionFromWork } from "@/lib/catalogue/edit";

export const runtime = "nodejs";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; editionId: string }> },
) {
  const { id, editionId } = await params;

  const work = await getWork(id);
  if (!work) return Response.json({ error: "not found" }, { status: 404 });
  if (!work.editionIds.includes(editionId)) {
    return Response.json({ error: "edition not part of this work" }, { status: 404 });
  }

  try {
    const { editionRemoved } = await deleteEditionFromWork(id, editionId);
    return Response.json({ ok: true, id, editionId, editionRemoved });
  } catch (err) {
    console.error("[editions/delete] failed:", err);
    return Response.json(
      { error: "delete failed", detail: String(err) },
      { status: 400 },
    );
  }
}
