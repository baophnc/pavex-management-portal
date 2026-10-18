import type { NextConfig } from "next";

// `next dev` runs with NODE_ENV=development, `next build` (and so the Docker image) with production.
// These headers are fixed at build time, so nothing here may depend on runtime-only settings.
const isDev = process.env.NODE_ENV === "development";

// Avatars are absolute URLs served by the gateway's public address (or typed in by an administrator),
// so any HTTPS image is allowed; locally the gateway is plain http. Map tiles come from
// tile.openstreetmap.org (features/fleet/trip-map.tsx); QR codes are inline SVG and CSV exports blob URLs.
const devGateway = isDev
  ? ` ${new URL(process.env.API_BASE_URL ?? "http://localhost:8080").origin}`
  : "";

const contentSecurityPolicy = [
  "default-src 'self'",
  // Next.js inlines its bootstrap scripts; React needs eval only for dev error overlays.
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  // React `style` props and Next.js inline styles.
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: https:${devGateway}`,
  "font-src 'self'",
  // The browser only talks to this BFF (/api/*); in dev also the HMR websocket on the same host.
  `connect-src 'self'${isDev ? " ws: wss:" : ""}`,
  "object-src 'none'",
  "frame-src 'none'",
  "worker-src 'self'",
  "manifest-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value:
      "camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=(), bluetooth=(), browsing-topics=(), clipboard-write=(self)",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ...(isDev
    ? []
    : [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains",
        },
      ]),
];

const nextConfig: NextConfig = {
  // The Docker image runs the traced server in .next/standalone (see Dockerfile).
  output: "standalone",
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
