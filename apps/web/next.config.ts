import type { NextConfig } from 'next';

const config: NextConfig = {
  output: 'standalone',
  transpilePackages: ['calendar-mercury-lab'],
  async rewrites() {
    const api = process.env.API_INTERNAL_URL ?? 'http://127.0.0.1:4000';

    return [
      { source: '/api/:path*', destination: `${api}/api/:path*` },
      { source: '/docs/:path*', destination: `${api}/docs/:path*` },
    ];
  },
};

export default config;
