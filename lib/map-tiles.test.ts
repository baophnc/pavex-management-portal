import { describe, expect, it } from "vitest";

import { contentSecurityPolicy } from "@/lib/content-security-policy";
import { mapTilesConfig, rasterTileUrl } from "@/lib/map-tiles";

const directive = (policy: string, name: string) => policy.split("; ").find((part) => part.startsWith(`${name} `));

describe("mapTilesConfig", () => {
  it("defaults to OpenStreetMap raster tiles and warns in production", () => {
    const dev = mapTilesConfig({ NODE_ENV: "development" });
    expect(dev.tiles).toMatchObject({ kind: "raster", provider: "osm", attribution: { label: "© OpenStreetMap contributors" } });
    expect(dev.origins).toEqual(["https://tile.openstreetmap.org"]);
    expect(dev.warning).toBeUndefined();
    expect(mapTilesConfig({ NODE_ENV: "production" }).warning).toMatch(/development only/);
  });

  it("uses Goong's vector style with the encoded key", () => {
    const { tiles, origins } = mapTilesConfig({ MAP_TILE_PROVIDER: "Goong", MAP_TILE_API_KEY: "a b" });
    expect(tiles).toEqual({
      kind: "vector",
      provider: "goong",
      styleUrl: "https://tiles.goong.io/assets/goong_map_web.json?api_key=a%20b",
      attribution: { label: "© Goong", href: "https://goong.io" },
    });
    expect(origins).toEqual(["https://tiles.goong.io"]);
  });

  it("uses VIETMAP's street style", () => {
    const { tiles, origins } = mapTilesConfig({ MAP_TILE_PROVIDER: "vietmap", MAP_TILE_API_KEY: "k" });
    expect(tiles).toMatchObject({ kind: "vector", styleUrl: "https://maps.vietmap.vn/maps/styles/tm/style.json?apikey=k", attribution: { label: "© VIETMAP" } });
    expect(origins).toEqual(["https://maps.vietmap.vn"]);
  });

  it("draws no base map without a key or for an unknown provider", () => {
    for (const env of [{ MAP_TILE_PROVIDER: "goong" }, { MAP_TILE_PROVIDER: "google", MAP_TILE_API_KEY: "k" }]) {
      const config = mapTilesConfig(env);
      expect(config.tiles.kind).toBe("none");
      expect(config.origins).toEqual([]);
      expect(config.warning).toBeTruthy();
    }
  });

  it("fills a raster template", () => {
    expect(rasterTileUrl("https://t.test/{z}/{x}/{y}.png", 5, 25, 14)).toBe("https://t.test/5/25/14.png");
  });
});

describe("contentSecurityPolicy", () => {
  it("allows exactly the configured provider's host", () => {
    const policy = contentSecurityPolicy({ NODE_ENV: "production", MAP_TILE_PROVIDER: "vietmap", MAP_TILE_API_KEY: "k" });
    expect(directive(policy, "connect-src")).toBe("connect-src 'self' https://maps.vietmap.vn");
    expect(directive(policy, "img-src")).toContain("https://maps.vietmap.vn");
    expect(policy).not.toContain("openstreetmap");
    expect(policy).not.toContain("'unsafe-eval'");
  });

  it("allows OSM, the local gateway and HMR in development", () => {
    const policy = contentSecurityPolicy({ NODE_ENV: "development", API_BASE_URL: "http://localhost:8080/" });
    expect(directive(policy, "img-src")).toBe("img-src 'self' data: blob: https: http://localhost:8080 https://tile.openstreetmap.org");
    expect(directive(policy, "connect-src")).toBe("connect-src 'self' https://tile.openstreetmap.org ws: wss:");
  });

  it("allows no map host when the provider is misconfigured", () => {
    const policy = contentSecurityPolicy({ NODE_ENV: "production", MAP_TILE_PROVIDER: "goong" });
    expect(directive(policy, "connect-src")).toBe("connect-src 'self'");
  });
});
