// next.config.js
/* eslint-disable @typescript-eslint/no-require-imports */

// 1. Use CommonJS require()
const withPWA = require('@ducanh2912/next-pwa').default({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
});

// 2. Define your Next.js config object
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // 🚫 Do NOT include: output: 'export'
};

// 3. Export the combined configuration
module.exports = withPWA(nextConfig);