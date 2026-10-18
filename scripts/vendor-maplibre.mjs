// MapLibre GL 6 runs its tile parsing in a module worker that bundlers cannot rewrite, so the worker and the module
// it imports are served from this origin (public/vendor, git-ignored). Runs before `next dev` and `next build`;
// features/fleet/vector-base-map.tsx points MapLibre at the same versioned path.
import { copyFile, mkdir, readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const dist = dirname(require.resolve("maplibre-gl/dist/maplibre-gl-worker.mjs"));
const { version } = JSON.parse(await readFile(join(dist, "..", "package.json"), "utf8"));
const target = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "vendor", "maplibre-gl", version);

await mkdir(target, { recursive: true });
for (const file of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) {
  await copyFile(join(dist, file), join(target, file));
}
