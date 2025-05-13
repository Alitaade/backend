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
  api: {
    bodyParser: {
      sizeLimit: '500mb', // For incoming requests
    },
    responseLimit: false, // For outgoing responses (disables the limit)
   
    // responseLimit: '50mb', // Adjust as needed
  },
  output: "standalone", // Updated from experimental.outputStandalone
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
