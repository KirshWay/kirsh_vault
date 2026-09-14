import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./setup.ts'],
    include: ['**/*.{test,spec}.{ts,tsx}'],
    exclude: [
      'node_modules/**',
      'tests/e2e/**',
      'test-results/**',
      'playwright-report/**',
      '.next/**',
      'out/**',
    ],
    globals: true,
    coverage: {
      provider: 'v8',
      include: [
        'app/**/*.{ts,tsx}',
        'components/**/*.{ts,tsx}',
        'lib/**/*.{ts,tsx}',
        'scripts/*.{js,mjs}',
      ],
      exclude: ['**/*.{test,spec}.{ts,tsx}'],
      reporter: ['text', 'html'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
