import { NextResponse, connection } from "next/server";

import { mapTilesConfig } from "@/lib/map-tiles";

let warned = false;

/** The base map the browser should draw, from this server's MAP_TILE_PROVIDER / MAP_TILE_API_KEY. */
export async function GET() {
  // Read the environment per request, never at build time: one image serves every deployment.
  await connection();
  const { tiles, warning } = mapTilesConfig();
  if (warning && !warned) {
    warned = true;
    console.warn(`[map-tiles] ${warning}`);
  }
  return NextResponse.json(tiles, { headers: { "Cache-Control": "no-store" } });
}
