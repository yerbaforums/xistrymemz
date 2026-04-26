import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
    ],
  },
  serverExternalPackages: ['@prisma/client', 'prisma'],
  experimental: {
    optimizePackageImports: ['next-auth'],
  },
};

export default nextConfig;