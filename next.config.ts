import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const nextConfig: NextConfig = {
  // A stray lockfile in the home directory makes Next infer the wrong workspace
  // root, which breaks server file tracing. Pin the root to this project.
  outputFileTracingRoot: __dirname,

  // Serve the static marketing page (public/welcome.html) at a clean /welcome.
  async rewrites() {
    return [{ source: "/welcome", destination: "/welcome.html" }];
  },
};

// PWA Stage 2 — Serwist builds the service worker from app/sw.ts into
// public/sw.js at build time. Disabled in dev to keep debugging clean; we
// register it manually (register:false) to drive the update toast.
const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
  register: false,
  reloadOnOnline: true,
});

export default withSerwist(nextConfig);
