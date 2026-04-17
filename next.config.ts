import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      { source: '/finance', destination: '/billing', permanent: true },
      { source: '/finance/:path*', destination: '/invoicing/:path*', permanent: true },
    ];
  },
};

export default nextConfig;
