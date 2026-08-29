import type { MetadataRoute } from "next";

// Web app manifest (PWA Stage 1). Served at /manifest.webmanifest by Next.
// display:standalone gives the installed app its own chrome-less window;
// the warm-paper colours match the reading-room palette in tailwind.config.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "The Library",
    short_name: "Library",
    description:
      "A personal book collection browsed by literary period and movement.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f4f1ea",
    theme_color: "#f1f4f1",
    categories: ["books", "education", "lifestyle"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icon-maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Capture books",
        short_name: "Capture",
        description: "Add books by photographing a shelf.",
        url: "/capture",
      },
      {
        name: "Reading record",
        short_name: "Reading",
        description: "Your chronological reading history.",
        url: "/reads",
      },
    ],
  };
}
