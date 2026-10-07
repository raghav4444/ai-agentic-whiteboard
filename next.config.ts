import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {
    root: process.cwd(),
  },
  images: {
    remotePatterns: [{
      protocol: 'https',
      hostname: 'img.clerk.com',
    }]
  }
};

export default nextConfig;
