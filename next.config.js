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
  
  
  // Remove api config - not compatible with output: 'export'
  // API route config is not used in static exports
  
  // Use a simplified exportPathMap for static export
  exportPathMap: async function() {
    return {
      '/': { page: '/' },
      '/api': { page: '/api' }
    }
  },

};

module.exports = nextConfig;