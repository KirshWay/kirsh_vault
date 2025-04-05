import type { NextConfig } from "next";
import withPWA from "next-pwa";

const basePath = process.env.NODE_ENV === "production" ? '/kirsh_vault' : '';

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

const pwaConfig = withPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  buildExcludes: [/middleware-manifest\.json$/],
  publicExcludes: ['!robots.txt', '!sitemap.xml'],
  scope: basePath || '/',
})(nextConfig);

export default pwaConfig;
