import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['js/**/*.test.{js,ts}', 'api/**/*.test.{js,ts}'],
    coverage: {
      provider: 'v8',
      reportsDirectory: 'coverage',
      reporter: ['text', 'html', 'lcov'],
      thresholds: {            // <-- moved here in Vitest v3
        lines: 80,
        functions: 80,
        branches: 70,
        statements: 80
      }
    }
  }
});
