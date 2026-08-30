// Bulk read-status editing: mark many works read/unread in one call. Marking
// read never overwrites an existing (e.g. Goodreads-dated) row; marking unread
// removes the rows. Owner-only via the global middleware gate.

import { z } from "zod";
import { revalidateTag } from "next/cache";
import { bulkSetReadStatus } from "@/lib/catalogue/edit";
import { CATALOGUE_TAG } from "@/lib/cache-tags";

export const runtime = "nodejs";

const BodySchema = z.object({
  workIds: z.array(z.string().min(1)).min(1).max(5000),
  read: z.boolean(),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "expected { workIds: string[], read: boolean }" },
      { status: 400 },
    );
  }

  try {
    const affected = await bulkSetReadStatus(parsed.data.workIds, parsed.data.read);
    revalidateTag(CATALOGUE_TAG);
    return Response.json({ ok: true, affected, read: parsed.data.read });
  } catch (err) {
    console.error("[books/read-status] bulk failed:", err);
    return Response.json(
      { error: "bulk update failed", detail: String(err) },
      { status: 400 },
    );
  }
}
