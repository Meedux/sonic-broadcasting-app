import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Don't resolve 'fs' module on the client to prevent this error on build --> Error: Can't resolve 'fs'
      config.resolve.fallback = {
        fs: false,
        stream: false,
        buffer: false,
        crypto: false,
        os: false,
        path: false,
      };
    }
    
    return config;
  },
  // experimental: {
  //   esmExternals: 'loose',
  // },
};

export default nextConfig;
