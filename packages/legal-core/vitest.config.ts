import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@statute-chain/types': resolve(__dirname, '../types/src/index.ts'),
      '@statute-chain/parser': resolve(__dirname, '../parser/src/index.ts'),
    },
  },
  test: {
    globals: true,
  },
})
