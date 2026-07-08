import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

// Test config for the project's unit tests. We run in a plain Node environment
// (no DOM) since the logic under test is server-side and pure.
//
// Two aliases keep server modules importable outside Next.js:
//  - `@/…`        mirrors the tsconfig path alias to the repo root.
//  - `server-only` resolves to a no-op stub; the real package throws when
//    imported without Next.js's `react-server` condition.
export default defineConfig({
  resolve: {
    alias: [
      { find: /^server-only$/, replacement: fileURLToPath(new URL('./test/stubs/server-only.ts', import.meta.url)) },
      { find: /^@\//, replacement: fileURLToPath(new URL('./', import.meta.url)) },
    ],
  },
  test: {
    environment: 'node',
    include: ['**/*.test.ts'],
  },
});
