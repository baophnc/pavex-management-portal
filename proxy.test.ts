import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { ACCESS_COOKIE, PASSWORD_CHANGE_COOKIE, REFRESH_COOKIE } from "@/lib/auth/session";
import { config, proxy } from "@/proxy";

function visit(path: string, cookies: Record<string, string> = {}) {
  const cookie = Object.entries(cookies)
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
  return proxy(new NextRequest(`http://portal.test${path}`, { headers: cookie ? { cookie } : {} }));
}

function redirectTarget(response: Response) {
  const location = response.headers.get("location");
  return location ? new URL(location) : null;
}

describe("proxy", () => {
  it("sends a signed-out visitor to /login and remembers where they were going", () => {
    const response = visit("/shipments/PAVEX123?tab=history");

    expect(response.status).toBe(307);
    const target = redirectTarget(response);
    expect(target?.pathname).toBe("/login");
    expect(target?.searchParams.get("returnTo")).toBe("/shipments/PAVEX123?tab=history");
  });

  it("lets a signed-out visitor open /login and the recovery pages", () => {
    for (const path of ["/login", "/forgot-password", "/reset-password", "/accept-invite"]) {
      expect(redirectTarget(visit(path)), path).toBeNull();
    }
  });

  it("serves the MapLibre worker without a session, under the same policy", () => {
    const response = visit("/vendor/maplibre-gl/6.11.2/maplibre-gl-worker.mjs");
    expect(redirectTarget(response)).toBeNull();
    expect(response.headers.get("content-security-policy")).toContain("worker-src 'self'");
  });

  it("treats a refresh cookie alone as signed in", () => {
    expect(redirectTarget(visit("/dashboard", { [REFRESH_COOKIE]: "r" }))).toBeNull();
  });

  it("sends a signed-in visitor away from /login", () => {
    expect(redirectTarget(visit("/login", { [ACCESS_COOKIE]: "a" }))?.pathname).toBe("/dashboard");
  });

  it("keeps an account on its temporary password on /change-password", () => {
    const cookies = { [ACCESS_COOKIE]: "a", [PASSWORD_CHANGE_COOKIE]: "1" };

    expect(redirectTarget(visit("/dashboard", cookies))?.pathname).toBe("/change-password");
    expect(redirectTarget(visit("/login", cookies))?.pathname).toBe("/change-password");
    expect(redirectTarget(visit("/change-password", cookies))).toBeNull();
  });

  it("sends an account without a temporary password away from /change-password", () => {
    expect(redirectTarget(visit("/change-password", { [ACCESS_COOKIE]: "a" }))?.pathname).toBe("/dashboard");
  });

  it("ignores a stale password-change marker without a session", () => {
    const target = redirectTarget(visit("/dashboard", { [PASSWORD_CHANGE_COOKIE]: "1" }));
    expect(target?.pathname).toBe("/login");
  });

  it("sends the Content-Security-Policy on pages and redirects", () => {
    expect(visit("/login").headers.get("content-security-policy")).toContain("default-src 'self'");
    expect(visit("/dashboard").headers.get("content-security-policy")).toContain("frame-ancestors 'none'");
  });

  it("does not run for API routes or static assets", () => {
    const matcher = new RegExp(`^${config.matcher[0]}$`);
    expect(matcher.test("/dashboard")).toBe(true);
    expect(matcher.test("/api/backend/v1/shipments")).toBe(false);
    expect(matcher.test("/_next/static/chunks/app.js")).toBe(false);
    expect(matcher.test("/favicon.ico")).toBe(false);
  });
});
