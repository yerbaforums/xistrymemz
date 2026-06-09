/** @type {import('next').NextConfig} */
const withNextIntl = require('next-intl/plugin')('./src/i18n/request.ts');
const { execSync } = require('child_process');

const gitHash = (() => {
  try { return execSync('git rev-parse --short HEAD', { encoding: 'utf8', timeout: 2000 }).trim() } catch { return 'dev' }
})()

const nextConfig = {
  env: {
    NEXT_PUBLIC_GIT_HASH: gitHash,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cryptologos.cc',
      },
      {
        protocol: 'https',
        hostname: '*.cloudflare.com',
      },
      {
        protocol: 'https',
        hostname: 'cdn.jsdelivr.net',
      },
      {
        protocol: 'https',
        hostname: 'api.qrserver.com',
      },
      {
        protocol: 'https',
        hostname: 'gateway.pinata.cloud',
      },
      {
        protocol: 'https',
        hostname: '*.pinata.cloud',
      },
      {
        protocol: 'https',
        hostname: 'ipfs.io',
      },
      {
        protocol: 'https',
        hostname: 'cloudflare-ipfs.com',
      },
      {
        protocol: 'https',
        hostname: 'dweb.link',
      },
      {
        protocol: 'https',
        hostname: 'ipfs.xistrymemz.xyz',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'cdn.discordapp.com',
      },
      {
        protocol: 'https',
        hostname: 'pbs.twimg.com',
      },
      {
        protocol: 'https',
        hostname: 'graph.facebook.com',
      },
    ],
  },
  poweredByHeader: false,
  serverExternalPackages: ['@prisma/client', 'prisma', 'geoip-lite'],
  experimental: {
    optimizePackageImports: ['next-auth'],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com; img-src 'self' https: data: blob:; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://api.coingecko.com https://nominatim.openstreetmap.org https://*.basemaps.cartocdn.com https://*.tile.openstreetmap.org https://tile.openstreetmap.org; frame-ancestors 'none'",
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(self), microphone=(self), geolocation=()',
          },
        ],
      },
    ];
  },
};

module.exports = withNextIntl(nextConfig);
