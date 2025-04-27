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
    domains: ["res.cloudinary.com", "images.unsplash.com", "via.placeholder.com"],
    unoptimized: true,
  },
  // Remove any CORS configuration from here to avoid conflicts with our middleware
  async headers() {
    return [
      {
        // Apply basic security headers to all routes
        source: "/api/:path*",
        headers: [
          { key: "X-DNS-Prefetch-Control", value: "on" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "origin-when-cross-origin" },
          // Remove the CORS headers from here - they'll be handled by middleware
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
