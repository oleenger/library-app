"use client";

import { useState } from "react";

// Stage 1: prove the pipe. Open the rear camera, take a shot, downscale it,
// upload to the server, show what the server received back. No LLM yet.

// Longest edge to downscale to before upload. 1600px keeps spine text legible
// (per proposal §9.1) while cutting a multi-MB photo to a few hundred KB. Bump
// this if identification quality suffers once the LLM stage is in.
const MAX_EDGE = 1600;

async function downscale(file: File, maxEdge = MAX_EDGE): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, maxEdge / Math.max(bmp.width, bmp.height));
  const canvas = new OffscreenCanvas(
    Math.round(bmp.width * scale),
    Math.round(bmp.height * scale),
  );
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close();
  return canvas.convertToBlob({ type: "image/jpeg", quality: 0.85 });
}

type Shot = {
  url: string;
  originalBytes: number;
  scaledBytes: number;
  status: "uploading" | "ok" | "error";
  reply?: string;
};

export default function CapturePage() {
  const [shots, setShots] = useState<Shot[]>([]);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    for (const file of files) {
      const scaled = await downscale(file);
      const url = URL.createObjectURL(scaled); // preview the DOWNSCALED image
      const index = shots.length;
      setShots((prev) => [
        ...prev,
        {
          url,
          originalBytes: file.size,
          scaledBytes: scaled.size,
          status: "uploading",
        },
      ]);

      try {
        const body = new FormData();
        body.append("photo", scaled, "shot.jpg");
        const res = await fetch("/api/intake/extract", { method: "POST", body });
        const json = await res.json();
        setShots((prev) =>
          prev.map((s, i) =>
            i === index
              ? { ...s, status: res.ok ? "ok" : "error", reply: JSON.stringify(json) }
              : s,
          ),
        );
      } catch (err) {
        setShots((prev) =>
          prev.map((s, i) =>
            i === index ? { ...s, status: "error", reply: String(err) } : s,
          ),
        );
      }
    }
  }

  const kb = (n: number) => `${Math.round(n / 1024)} KB`;

  return (
    <main style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <h1>Camera capture test</h1>
      <p>
        Take a photo of a shelf. It is downscaled to {MAX_EDGE}px longest edge,
        uploaded, and the server echoes what it got. The thumbnail below is the
        downscaled image — check the spines are still readable.
      </p>

      <input
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        onChange={onPick}
      />

      <div style={{ marginTop: 24, display: "grid", gap: 16 }}>
        {shots.map((s, i) => (
          <div key={i} style={{ display: "flex", gap: 12, alignItems: "center" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={s.url}
              alt={`shot ${i + 1}`}
              style={{ width: 200, borderRadius: 8, border: "1px solid #ccc" }}
            />
            <div>
              <div>
                {s.status === "uploading" && "⏳ uploading…"}
                {s.status === "ok" && "✅ server received"}
                {s.status === "error" && "❌ error"}
              </div>
              <div style={{ fontSize: 13, color: "#555" }}>
                {kb(s.originalBytes)} → {kb(s.scaledBytes)} (
                {Math.round((1 - s.scaledBytes / s.originalBytes) * 100)}% smaller)
              </div>
              {s.reply && (
                <code style={{ fontSize: 12, color: "#555" }}>{s.reply}</code>
              )}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
