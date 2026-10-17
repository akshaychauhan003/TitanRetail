/** @type {import('next').NextConfig} */
const backendTarget = (process.env.BACKEND_URL || 'http://localhost:48291').replace(/\/$/, '');

const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${backendTarget}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
