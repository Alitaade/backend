/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable all frontend-related features
  output: 'standalone', // For server-only deployment
  reactStrictMode: false,
  swcMinify: true,
  
  // Disable build-time checks
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  
  // API-specific config
  api: {
    bodyParser: { sizeLimit: "10mb" },
    responseLimit: "10mb",
    externalResolver: true // Important for serverless functions
  },
  
  // Disable all static generation
  experimental: {
    outputFileTracingExcludes: { 
      '*': ['**/*'] // Skip all frontend files
    }
  },
  
  // CORS headers
  async headers() {
    return [{
      source: "/api/:path*",
      headers: [
        { key: "Access-Control-Allow-Origin", value: "*" },
        { key: "Access-Control-Allow-Methods", value: "GET,POST,PUT,DELETE,OPTIONS" }
      ]
    }]
  }
}

module.exports = nextConfig