import type { NextConfig } from 'next';

const basePath = process.env.NODE_ENV === 'production' ? '/kirsh_vault' : '';

const nextConfig: NextConfig = {
  output: 'export',
  basePath,
  assetPrefix: basePath,
  images: {
    unoptimized: true,
  },
  reactStrictMode: false,
  trailingSlash: false,
};

export default nextConfig;
