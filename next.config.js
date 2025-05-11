/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // For server-only deployment
  reactStrictMode: false,
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  
  // Disable all static generation
  experimental: {
    outputFileTracingExcludes: { '*': ['**/*'] }
  },
  
  // API config
  api: {
    bodyParser: { sizeLimit: "10mb" },
    externalResolver: true
  }
}

module.exports = nextConfig