import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Vitest runs the suites that came with the code ported from edge8-web
// (src/kernel, src/entities). The chapter app's own tests stay on node --test.
// The aliases mirror tsconfig.json's paths.
export default defineConfig({
  oxc: { jsx: { runtime: "automatic" } },
  resolve: {
    alias: [
      { find: "@/vercel.json", replacement: fileURLToPath(new URL("./vercel.json", import.meta.url)) },
      { find: /^@\//, replacement: fileURLToPath(new URL("./src/", import.meta.url)) },
    ],
  },
  test: {
    environment: "node",
    testTimeout: 30_000,
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/kernel/**/*.test.{ts,tsx}", "src/entities/**/*.test.{ts,tsx}"],
    // Tests of edge8-web's repository itself, which this app does not have:
    // the entity manifest (entities.manifest.json).
    exclude: ["node_modules/**", "src/entities/*/tables.test.ts"],
  },
});
