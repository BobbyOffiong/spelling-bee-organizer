// next.config.ts
import withPWA from '@ducanh2912/next-pwa';

const withPWAConfig = withPWA({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
});

const nextConfig = {
  reactStrictMode: true,

  // ✅ Ignore ESLint errors during builds
  eslint: {
    ignoreDuringBuilds: true,
  },

  // ✅ Ignore TypeScript errors during builds
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default withPWAConfig(nextConfig);
