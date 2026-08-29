// Stage 1b: prove the photo reaches the server. No LLM yet — just accept the
// upload, read it, and echo back what we received. If the client sees the byte
// count and type it sent, the upload pipe works.

export const runtime = "nodejs";

const MAX_BYTES = 12 * 1024 * 1024; // 12 MB cap per photo

export async function POST(req: Request) {
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

  const bytes = await file.arrayBuffer();

  return Response.json({
    ok: true,
    name: file.name,
    type: file.type,
    bytes: bytes.byteLength,
  });
}
