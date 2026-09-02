const { networkInterfaces } = require('node:os')

const lanDevOrigins = Object.values(networkInterfaces())
  .flatMap(addresses => addresses ?? [])
  .filter(({ family, internal }) => family === 'IPv4' && !internal)
  .map(({ address }) => address)

module.exports = {
  allowedDevOrigins: [
    'aaronwright-dot-ca.localhost',
    '127.0.0.1',
    ...lanDevOrigins,
  ],
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
    ]
  },
}
