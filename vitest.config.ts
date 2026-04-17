import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@statute-chain/types': resolve(__dirname, 'packages/types/src/index.ts'),
      '@statute-chain/legal-core': resolve(__dirname, 'packages/legal-core/src/index.ts'),
    },
  },
  test: {
    globals: true,
    include: ['tests/**/*.test.ts', 'packages/*/src/**/*.test.ts'],
  },
})
