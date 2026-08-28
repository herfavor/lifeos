import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./config/vitest.setup.ts'],
    css: true,
    // WebCrypto/PBKDF2 tests are CPU-intensive. Keeping a bounded worker pool
    // prevents unrelated jsdom tests from timing out under full-suite load.
    maxWorkers: 4,
    // Exclude Playwright E2E tests - they run separately via `npx playwright test`
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/tests/e2e/**',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData/',
        'src/main.tsx',
        'tests/e2e/**',
      ],
    },
  },
});
