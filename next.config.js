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
      sizeLimit: '50mb', // For incoming requests
    },
    responseLimit: false, // For outgoing responses (disables the limit)
    // Alternative: set a specific limit
    // responseLimit: '50mb', // Adjust as needed
  },
  experimental: {
    largePageDataBytes: 128 * 1000 * 1000, // 128MB, for large page data (props)
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