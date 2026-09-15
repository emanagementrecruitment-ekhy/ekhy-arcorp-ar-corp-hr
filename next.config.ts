import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Purely additive: also emits a self-contained .next/standalone build
  // (minimal server.js + pruned node_modules) alongside the normal build.
  // Railway still runs `next start` as before — this only feeds the
  // desktop app's bundler (see desktop/build-desktop.sh), which needs a
  // build that runs without the full monorepo node_modules installed.
  output: "standalone",
};

export default nextConfig;
