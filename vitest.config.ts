import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['js/**/*.test.{js,ts}', 'api/**/*.test.{js,ts}'],
    coverage: {
      provider: 'v8',
      reportsDirectory: 'coverage',
      reporter: ['text', 'html', 'lcov'],
      include: ['js/lib/**/*.js', 'api/**/*.ts'],
      exclude: [
        '**/*.test.*',
        'js/app.js',
        'js/easter-eggs.js'
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 70,
        statements: 80
      }
    }
  }
});
