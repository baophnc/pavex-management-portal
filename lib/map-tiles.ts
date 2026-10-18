// Which base map the fleet/network maps draw, chosen per environment at runtime (the Docker image is built once).
// Read by proxy.ts (Content-Security-Policy) and /api/map-tiles (the browser's map), so both always agree.
//
// Goong and VIETMAP publish their street maps only as vector styles (MapLibre style.json); neither offers raster
// street tiles (VIETMAP's only raster layer is unlabelled satellite imagery). Their key is part of every request the
// browser makes, so it is public by design: restrict it to the portal's domain in the provider console.

export const MAP_TILE_PROVIDERS = ["osm", "goong", "vietmap"] as const;

export type MapTileProvider = (typeof MAP_TILE_PROVIDERS)[number];

export type MapAttribution = { label: string; href: string };

/** What the browser needs to draw the base map. Never holds anything that is not already public. */
export type MapTiles =
  /** XYZ raster tiles, 256 px; the template holds `{z}`, `{x}` and `{y}`. */
  | { kind: "raster"; provider: MapTileProvider; tileUrl: string; attribution: MapAttribution }
  /** A MapLibre style.json; the style brings its own sources, sprites and glyphs. */
  | { kind: "vector"; provider: MapTileProvider; styleUrl: string; attribution: MapAttribution }
  /** Misconfigured: draw no base map rather than fall back to a server we may not use. */
  | { kind: "none"; provider: string };

export type MapTilesConfig = {
  tiles: MapTiles;
  /** Origins the browser fetches tiles, styles, sprites and glyphs from (CSP img-src and connect-src). */
  origins: string[];
  /** Why the configuration is unusable or unsuitable for production; logged by the server. */
  warning?: string;
};

type Env = Partial<Record<string, string>>;

export function mapTilesConfig(env: Env = process.env): MapTilesConfig {
  const provider = (env.MAP_TILE_PROVIDER?.trim() || "osm").toLowerCase();
  const key = env.MAP_TILE_API_KEY?.trim() ?? "";

  if (provider === "osm") {
    return {
      tiles: {
        kind: "raster",
        provider,
        tileUrl: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
        attribution: { label: "© OpenStreetMap contributors", href: "https://www.openstreetmap.org/copyright" },
      },
      origins: ["https://tile.openstreetmap.org"],
      warning:
        env.NODE_ENV === "production"
          ? "MAP_TILE_PROVIDER=osm: OpenStreetMap's public tile server is for development only; set goong or vietmap."
          : undefined,
    };
  }

  if (provider !== "goong" && provider !== "vietmap") {
    return {
      tiles: { kind: "none", provider },
      origins: [],
      warning: `MAP_TILE_PROVIDER=${provider} is not one of ${MAP_TILE_PROVIDERS.join(", ")}; no base map is drawn.`,
    };
  }
  if (!key) {
    return {
      tiles: { kind: "none", provider },
      origins: [],
      warning: `MAP_TILE_PROVIDER=${provider} needs MAP_TILE_API_KEY; no base map is drawn.`,
    };
  }

  const encodedKey = encodeURIComponent(key);
  if (provider === "goong") {
    // Map tiles key (not the REST API key); https://help.goong.io/kb/website-javascrip-api/maplibre/
    return {
      tiles: {
        kind: "vector",
        provider,
        styleUrl: `https://tiles.goong.io/assets/goong_map_web.json?api_key=${encodedKey}`,
        attribution: { label: "© Goong", href: "https://goong.io" },
      },
      origins: ["https://tiles.goong.io"],
    };
  }
  // Street style "tm"; https://maps.vietmap.vn/docs/map-api/tilemap/
  return {
    tiles: {
      kind: "vector",
      provider,
      styleUrl: `https://maps.vietmap.vn/maps/styles/tm/style.json?apikey=${encodedKey}`,
      attribution: { label: "© VIETMAP", href: "https://maps.vietmap.vn" },
    },
    origins: ["https://maps.vietmap.vn"],
  };
}

/** One raster tile's address. */
export function rasterTileUrl(template: string, z: number, x: number, y: number) {
  return template.replace("{z}", String(z)).replace("{x}", String(x)).replace("{y}", String(y));
}
