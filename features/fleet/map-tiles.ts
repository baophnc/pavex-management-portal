"use client";

import { useEffect, useState } from "react";

import type { MapTiles } from "@/lib/map-tiles";

// Fetched once per page load: the provider is server configuration (MAP_TILE_PROVIDER), read at runtime.
let request: Promise<MapTiles | null> | null = null;
let loaded: MapTiles | null = null;

function loadMapTiles() {
  request ??= fetch("/api/map-tiles")
    .then((response) => (response.ok ? (response.json() as Promise<MapTiles>) : null))
    .catch(() => null)
    .then((tiles) => {
      if (tiles) loaded = tiles;
      else request = null; // Try again on the next map.
      return tiles;
    });
  return request;
}

/** The configured base map, or null until it is known. */
export function useMapTiles() {
  const [tiles, setTiles] = useState(loaded);
  useEffect(() => {
    if (tiles) return;
    let active = true;
    void loadMapTiles().then((next) => {
      if (active && next) setTiles(next);
    });
    return () => {
      active = false;
    };
  }, [tiles]);
  return tiles;
}
