"use client";

import "maplibre-gl/dist/maplibre-gl.css";

import type { Map as MapLibreMap } from "maplibre-gl";
import { useEffect, useRef } from "react";

import type { MapAttribution } from "@/lib/map-tiles";

type LatLng = { lat: number; lng: number };

/**
 * A provider's vector style drawn by MapLibre as a still picture under TripMap's own overlays. TripMap keeps
 * handling pan and zoom; this only follows its camera. TripMap's zoom counts 256 px tiles and MapLibre's 512 px
 * ones, so MapLibre runs one zoom level lower for the same scale.
 */
export function VectorBaseMap({ styleUrl, attribution, center, zoom }: {
  styleUrl: string;
  attribution: MapAttribution;
  center: LatLng;
  zoom: number;
}) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibreMap | null>(null);
  const { lat, lng } = center;
  const camera = useRef({ lat, lng, zoom });

  useEffect(() => {
    camera.current = { lat, lng, zoom };
    map.current?.jumpTo({ center: [lng, lat], zoom: zoom - 1 });
  }, [lat, lng, zoom]);

  useEffect(() => {
    let cancelled = false;
    let instance: MapLibreMap | null = null;
    // Loaded only when a vector provider is configured; the OSM development map does not need it.
    void import("maplibre-gl").then(({ AttributionControl, Map, getVersion, setWorkerUrl }) => {
      const element = container.current;
      if (cancelled || !element) return;
      // Copied there by scripts/vendor-maplibre.mjs: MapLibre cannot find its worker inside the bundle.
      setWorkerUrl(`/vendor/maplibre-gl/${getVersion()}/maplibre-gl-worker.mjs`);
      const start = camera.current;
      instance = new Map({
        container: element,
        style: styleUrl,
        center: [start.lng, start.lat],
        zoom: start.zoom - 1,
        interactive: false,
        attributionControl: false,
      });
      // Keeps the provider's own source attributions next to ours.
      instance.addControl(
        new AttributionControl({
          compact: true,
          customAttribution: `<a href="${attribution.href}" target="_blank" rel="noreferrer">${attribution.label}</a>`,
        }),
        "bottom-right",
      );
      map.current = instance;
    });
    return () => {
      cancelled = true;
      instance?.remove();
      map.current = null;
    };
  }, [styleUrl, attribution.href, attribution.label]);

  return <div ref={container} className="absolute inset-0" />;
}
