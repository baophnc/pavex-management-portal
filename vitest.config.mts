import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@/": root,
      // `server-only` throws outside a React Server bundle; the BFF code under test is server code.
      "server-only": `${root}test/server-only.ts`,
    },
  },
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
    exclude: ["node_modules/**", ".next/**"],
    // Requests must never reach a real gateway: every test stubs fetch.
    env: { API_BASE_URL: "http://gateway.test" },
    unstubGlobals: true,
    restoreMocks: true,
  },
});
