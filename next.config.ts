import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Purely additive: also emits a self-contained .next/standalone build
  // (minimal server.js + pruned node_modules) alongside the normal build.
  // Railway still runs `next start` as before — this only feeds the
  // desktop app's bundler (see desktop/build-desktop.sh), which needs a
  // build that runs without the full monorepo node_modules installed.
  output: "standalone",

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Nothing here embeds AR Corp in an iframe on purpose — this closes
          // off clickjacking (a transparent iframe overlaid on the login/app
          // to trick a click) rather than something the app relies on.
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), payment=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
        ],
      },
    ];
  },
};

export default nextConfig;
