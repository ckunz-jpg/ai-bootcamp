/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  },
  // Optimize for production
  swcMinify: true,
  compress: true,
  // Production-specific settings
  ...(process.env.NODE_ENV === 'production' && {
    typescript: {
      // Note: This allows production builds to complete even with type errors
      // Remove this in production if you want strict type checking
      ignoreBuildErrors: false,
    },
    eslint: {
      // Runs ESLint during builds
      ignoreDuringBuilds: false,
    },
  }),
};

module.exports = nextConfig;
