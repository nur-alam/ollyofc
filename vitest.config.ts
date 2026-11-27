import path from "path";
import { defineConfig } from "vitest/config";

// Kept apart from vite.config.ts so a test run does not load the PWA, Tailwind,
// or local API plugins. Tests cover pure functions and do not open Firestore.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
