"use client";

import { useState } from "react";

// Stage 1a: prove the camera. No upload, no server, no LLM.
// Open the rear camera, take a shot, show it back. That's the whole test.
export default function CapturePage() {
  const [urls, setUrls] = useState<string[]>([]);

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    setUrls((prev) => [...prev, ...files.map((f) => URL.createObjectURL(f))]);
  }

  return (
    <main style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <h1>Camera capture test</h1>
      <p>Take a photo of a shelf. It should appear below.</p>

      <input
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        onChange={onPick}
      />

      <div
        style={{
          marginTop: 24,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
          gap: 12,
        }}
      >
        {urls.map((url, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={i}
            src={url}
            alt={`shot ${i + 1}`}
            style={{ width: "100%", borderRadius: 8, border: "1px solid #ccc" }}
          />
        ))}
      </div>

      {urls.length > 0 && (
        <p style={{ marginTop: 16 }}>{urls.length} photo(s) captured.</p>
      )}
    </main>
  );
}
