import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      { source: '/finance', destination: '/invoicing', permanent: true },
      { source: '/finance/:path*', destination: '/invoicing/:path*', permanent: true },
    ];
  },
};

export default nextConfig;
