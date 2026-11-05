import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: { globals: true, include: ['{apps,packages}/*/src/**/*.test.ts', 'scripts/**/*.test.ts'] },
})
