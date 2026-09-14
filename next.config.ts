import type { NextConfig } from 'next';

import { BASE_PATH } from './lib/config/site.mjs';

const nextConfig: NextConfig = {
  output: 'export',
  basePath: BASE_PATH,
  images: {
    unoptimized: true,
  },
  reactStrictMode: true,
  trailingSlash: false,
};

export default nextConfig;
