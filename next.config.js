/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  output: "standalone", // Updated from experimental.outputStandalone
  // Configure both incoming and outgoing request limits
  api: {
    bodyParser: {
      sizeLimit: "50mb", // For incoming requests
    },
    responseLimit: "50mb", // Increase the response limit to 50MB
  },
  experimental: {
    largePageDataBytes: 128 * 1000 * 1000, // 128MB, for large page data (props)
    // Enable compression for all responses
    compress: true,
  },
  async headers() {
    return [
      {
        // Apply CORS headers to all routes
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          { key: "Access-Control-Allow-Origin", value: "*" },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET,DELETE,PATCH,POST,PUT,OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value:
              "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, X-API-Key, x-api-key",
          },
          // Add compression-related headers
          { key: "Content-Encoding", value: "gzip" },
          { key: "Accept-Encoding", value: "gzip, deflate, br" },
        ],
      },
    ]
  },
  async redirects() {
    return [
      {
        source: "/",
        destination: "/api",
        permanent: true,
      },
    ]
  },
}

module.exports = nextConfig
