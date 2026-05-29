module.exports = {
  reactStrictMode: false,
  async redirects() {
    return [
      {
        source: '/projects/:path*',
        destination: '/work/:path*',
        permanent: true,
      },
      {
        source: '/slides/:path*',
        destination: '/work/:path*',
        permanent: true,
      },
    ];
  },
};
