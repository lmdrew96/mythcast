import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    // Scoped to tests/ only — keeps vitest from touching convex/ (whose
    // bundler isn't meant to see test-framework imports).
    include: ["tests/**/*.test.ts"],
  },
});
