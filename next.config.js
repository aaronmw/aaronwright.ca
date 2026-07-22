module.exports = {
  reactStrictMode: false,
  reactCompiler: true,
  async redirects() {
    return [
      {
        source: '/',
        destination: '/work',
        permanent: true,
      },
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
