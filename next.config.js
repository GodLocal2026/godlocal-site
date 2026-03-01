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
  async rewrites() {
    return [
      { source: '/game', destination: '/api/game' },
      { source: '/static/pwa/voice.html', destination: '/api/voice' },
      { source: '/voice', destination: '/api/voice' },
      { source: '/static/pwa/smertch.html', destination: '/api/smertch' },
    ];
  },
};
module.exports = nextConfig;
