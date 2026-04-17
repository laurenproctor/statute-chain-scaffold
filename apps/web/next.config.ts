import type { NextConfig } from 'next'

const config: NextConfig = {
  transpilePackages: ['@statute-chain/legal-core', '@statute-chain/types'],
}

export default config
