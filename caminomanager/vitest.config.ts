import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/__tests__/**',
        'src/**/index.ts',
        'src/components/ui/**',
        'src/components/**/*.tsx',
        'src/contexts/**',
        'src/types/**',
        'src/utils/**',
        'src/app/**',
      ],
      thresholds: {
        lines: 15,
        functions: 15,
        branches: 14,
        statements: 15,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
