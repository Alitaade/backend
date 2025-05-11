/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  typescript: {
    ignoreBuildErrors: true, // Suppresses TS errors in production builds
  },
  images: {
    unoptimized: true,
  },
  output: 'export', // Updated from experimental.outputStandalone
  api: {
    responseLimit: "10mb", // Increase API response limit to 10MB
    bodyParser: {
      sizeLimit: "10mb", // Increase body parser limit to 10MB
    },
  },
  exportPathMap: async function() {
    return {
      '/': { page: '/' },
      '/api': { page: '/api' }
    }
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
              "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization",
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/",
        destination: "/api",
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;
