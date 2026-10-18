import { mapTilesConfig } from "@/lib/map-tiles";

type Env = Partial<Record<string, string>>;

/**
 * The pages' Content-Security-Policy. proxy.ts builds it per request from the server's environment, so the map
 * provider and gateway configured for a deployment are allowed without rebuilding the image.
 */
export function contentSecurityPolicy(env: Env = process.env) {
  // `next dev` runs with NODE_ENV=development, `next build` (and so the Docker image) with production.
  const isDev = env.NODE_ENV === "development";
  // Avatars are absolute URLs served by the gateway's public address (or typed in by an administrator), so any
  // HTTPS image is allowed; locally the gateway is plain http. QR codes are inline SVG and CSV exports blob URLs.
  const devGateway = isDev ? [new URL(env.API_BASE_URL ?? "http://localhost:8080").origin] : [];
  // The base map's tile/style host (lib/map-tiles.ts); vector maps fetch tiles, sprites and glyphs.
  const map = mapTilesConfig(env).origins;

  return [
    "default-src 'self'",
    // Next.js inlines its bootstrap scripts; React needs eval only for dev error overlays.
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
    // React `style` props and Next.js inline styles.
    "style-src 'self' 'unsafe-inline'",
    ["img-src 'self' data: blob: https:", ...devGateway, ...map].join(" "),
    "font-src 'self'",
    // The browser talks to this BFF (/api/*) and the map provider; in dev also the HMR websocket on the same host.
    ["connect-src 'self'", ...map, ...(isDev ? ["ws:", "wss:"] : [])].join(" "),
    "object-src 'none'",
    "frame-src 'none'",
    // MapLibre's tile workers are served from this origin.
    "worker-src 'self'",
    "manifest-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}
