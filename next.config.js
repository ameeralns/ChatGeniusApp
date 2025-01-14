/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'chatgeniusfilesbucket.s3.amazonaws.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'chatgeniusfilesbucket.s3.us-east-1.amazonaws.com',
        port: '',
        pathname: '/**',
      }
    ],
    unoptimized: true
  },
  experimental: {
    optimizePackageImports: ['@firebase/auth', '@firebase/database', '@firebase/storage'],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        dns: false,
        'perf_hooks': false,
        child_process: false,
      };
    }
    config.externals = [...(config.externals || []), 'canvas', 'jsdom'];
    return config;
  },
}

module.exports = nextConfig 