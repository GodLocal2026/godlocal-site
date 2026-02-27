/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      { source: '/github', destination: 'https://github.com/GODLOCAL/godlocal', permanent: false },
      { source: '/docs', destination: 'https://github.com/GODLOCAL/godlocal/blob/main/README.md', permanent: false },
    ];
  },
};
module.exports = nextConfig;
