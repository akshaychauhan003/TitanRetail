/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    // On Vercel, vercel.json handles routing to backend service at the edge.
    // Only rewrite to local backend port during standalone local development.
    if (!process.env.VERCEL && !process.env.BACKEND_URL) {
      return [
        {
          source: '/api/:path*',
          destination: 'http://localhost:48291/api/:path*',
        },
      ];
    }
    return [];
  },
};

export default nextConfig;
