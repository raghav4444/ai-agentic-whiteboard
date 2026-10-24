import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Keep the dev overlay from covering the workspace chrome.
  devIndicators: false,
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
