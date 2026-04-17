/** @type {import('next').NextConfig} */
const config = {
  transpilePackages: [
    '@statute-chain/database',
    '@statute-chain/legal-core',
    '@statute-chain/parser',
    '@statute-chain/types',
  ],
  webpack(webpackConfig) {
    // ESM packages use `.js` extensions in imports; webpack needs to map them to `.ts`
    webpackConfig.resolve.extensionAlias = {
      '.js': ['.ts', '.tsx', '.js'],
    }
    return webpackConfig
  },
}

export default config
