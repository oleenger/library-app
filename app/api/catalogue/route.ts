import { getWorks } from "@/lib/books";

// PWA Stage 3 — catalogue as JSON for the offline mirror.
// Lets the client hydrate/refresh its IndexedDB snapshot independently of the
// server-rendered HTML. Dynamic: always reflects the live catalogue.
export const dynamic = "force-dynamic";

export async function GET() {
  const works = await getWorks();
  return Response.json({ works, syncedAt: Date.now() });
}
