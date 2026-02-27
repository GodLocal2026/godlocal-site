/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['avatars.githubusercontent.com'],
  },
  async redirects() {
    return [
      {
        source: '/github',
        destination: 'https://github.com/GodLocal2026/godlocal-site',
        permanent: false,
      },
    ];
  },
};
module.exports = nextConfig;