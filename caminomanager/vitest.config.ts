import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    allowOnly: !process.env.CI,
    // Bound jsdom concurrency so UI tests are not starved during coverage runs.
    maxWorkers: 4,
    // Instrumented form interactions need more time on Windows/CI workers.
    testTimeout: 15_000,
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'html', 'lcov', 'json-summary'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/__tests__/**',
        'src/**/index.ts',
        'src/components/ui/**',
        'src/types/**',
        'src/**/*.d.ts',
      ],
      thresholds: {
        // Enforce global coverage without excluding untested application code.
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
        'src/lib/permissions.ts': {
          lines: 100, functions: 100, branches: 95, statements: 100,
        },
        'src/lib/form-schema.ts': {
          lines: 95, functions: 100, branches: 95, statements: 95,
        },
        'src/lib/supabaseErrors.ts': {
          lines: 100, functions: 100, branches: 95, statements: 100,
        },
        'src/config/carisma.ts': {
          lines: 100, functions: 100, branches: 100, statements: 100,
        },
        'src/lib/csv-parser.ts': {
          lines: 90, functions: 85, branches: 90, statements: 90,
        },
        'src/lib/bulk-upload-service.ts': {
          lines: 90, functions: 90, branches: 80, statements: 90,
        },
        'src/lib/auditMessages.ts': {
          lines: 90, functions: 100, branches: 80, statements: 90,
        },
        'src/hooks/useCrud.ts': {
          lines: 80, functions: 80, branches: 65, statements: 80,
        },
        'src/hooks/useCommunityAccess.ts': {
          lines: 100, functions: 100, branches: 90, statements: 100,
        },
        'src/hooks/useCommunityData.ts': {
          lines: 95, functions: 100, branches: 90, statements: 95,
        },
        'src/hooks/useParishData.ts': {
          lines: 100, functions: 100, branches: 100, statements: 100,
        },
        'src/hooks/useCatechistTeamsReport.ts': {
          lines: 100, functions: 100, branches: 95, statements: 100,
        },
        'src/hooks/usePriestsReport.ts': {
          lines: 100, functions: 100, branches: 100, statements: 100,
        },
        'src/hooks/useParishCatechesisReport.ts': {
          lines: 100, functions: 100, branches: 100, statements: 100,
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
