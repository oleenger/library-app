"use client";

import { useState } from "react";

// Stage 1: prove the pipe. Open the rear camera, take a shot, upload it to the
// server, show what the server received back. No LLM yet.
type Shot = {
  url: string;
  status: "uploading" | "ok" | "error";
  reply?: string;
};

export default function CapturePage() {
  const [shots, setShots] = useState<Shot[]>([]);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    for (const file of files) {
      const url = URL.createObjectURL(file);
      const index = shots.length;
      setShots((prev) => [...prev, { url, status: "uploading" }]);

      try {
        const body = new FormData();
        body.append("photo", file);
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

  return (
    <main style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <h1>Camera capture test</h1>
      <p>Take a photo of a shelf. It uploads and the server echoes what it got.</p>

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
              style={{ width: 120, borderRadius: 8, border: "1px solid #ccc" }}
            />
            <div>
              <div>
                {s.status === "uploading" && "⏳ uploading…"}
                {s.status === "ok" && "✅ server received"}
                {s.status === "error" && "❌ error"}
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
