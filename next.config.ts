import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A stray lockfile in the home directory makes Next infer the wrong workspace
  // root, which breaks server file tracing. Pin the root to this project.
  outputFileTracingRoot: __dirname,
};

export default nextConfig;
