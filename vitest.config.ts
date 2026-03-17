import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "happy-dom",
    globals: true,
    setupFiles: ["./client/src/test/setup.ts"],
    include: [
      "client/src/**/*.test.{ts,tsx}",
      "supabase/functions/__tests__/**/*.test.ts",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: [
        "client/src/**/*.{ts,tsx}",
        "supabase/functions/_shared/**/*.ts",
        "supabase/functions/*/index.ts",
        "shared/**/*.ts",
        "lib/**/*.ts",
      ],
      exclude: [
        "client/src/**/*.test.{ts,tsx}",
        "client/src/test/**",
        "supabase/functions/__tests__/**",
        "supabase/functions/_shared/deno.d.ts",
        "**/*.d.ts",
      ],
    },
  },
  resolve: {
    alias: [
      { find: "@", replacement: path.resolve(__dirname, "./client/src") },
      { find: "@shared", replacement: path.resolve(__dirname, "./shared") },
      // Map Deno npm: specifiers to the installed Node packages
      { find: /^npm:zod.*/, replacement: "zod" },
      { find: /^npm:@supabase\/supabase-js.*/, replacement: "@supabase/supabase-js" },
      { find: /^npm:nodemailer.*/, replacement: "nodemailer" },
      { find: /^npm:jose.*/, replacement: "jose" },
    ],
  },
});
