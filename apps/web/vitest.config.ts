import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@statute-chain/types': resolve(__dirname, '../../packages/types/src/index.ts'),
      '@statute-chain/legal-core': resolve(__dirname, '../../packages/legal-core/src/index.ts'),
      '@statute-chain/parser': resolve(__dirname, '../../packages/parser/src/index.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['app/**/*.test.ts'],
  },
})
