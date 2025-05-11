/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: false,
  
  // Disable all frontend features
  experimental: {
    outputFileTracingExcludes: { '*': ['**/*.html', '**/*.css', '**/*.js'] }
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  
  
  // API-specific settings
  api: {
    bodyParser: { sizeLimit: "10mb" },
    externalResolver: true
  },
  
  // Disable static generation
  skipTrailingSlashRedirect: true,
  skipMiddlewareUrlNormalize: true
}

module.exports = nextConfig