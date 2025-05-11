/** @type {import('next').NextConfig} */
const nextConfig = {
  // Core settings
  reactStrictMode: true,
  swcMinify: true,
  output: 'standalone', // Essential for API-only deployment
  
  // TypeScript/ESLint handling
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Image handling (disabled for API-only)
  images: {
    unoptimized: true,
  },

  // API configuration
  api: {
    responseLimit: "10mb",
    bodyParser: {
      sizeLimit: "10mb",
    },
    externalResolver: true, // Important for serverless functions
  },

  // Performance optimizations
  experimental: {
    outputFileTracingExcludes: {
      '*': [
        '**/*.html',
        '**/*.css',
        '**/*.js',
        '**/*.svg',
        '**/*.png',
        '**/*.jpg'
      ]
    },
    serverComponentsExternalPackages: ['@prisma/client'], // Add if using Prisma
  },


  // Disable all static generation features
  skipTrailingSlashRedirect: true,
  skipMiddlewareUrlNormalize: true
}

module.exports = nextConfig