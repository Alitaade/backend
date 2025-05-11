/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Remove swcMinify - it's no longer needed as an explicit option in Next.js 15+
  
  typescript: {
    ignoreBuildErrors: true, // Suppresses TS errors in production builds
  },
  
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  images: {
    unoptimized: true, // Required for static export
  },
  
  output: 'export', // Static export mode
  
  // Remove api config - not compatible with output: 'export'
  // API route config is not used in static exports
  
  // Use a simplified exportPathMap for static export
  exportPathMap: async function() {
    return {
      '/': { page: '/' },
      '/api': { page: '/api' },
      '/404': { page: '/404' }
    }
  },
  
  // Static exports don't support dynamic headers
  // You'll need to handle CORS in your hosting provider (Netlify)
  // or add a _headers file for Netlify in your public directory
  
  // Use redirects() for Next.js development only
  // For static exports, Netlify redirects should be defined in a _redirects file
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