import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: '/pharmacy',
        destination: '/pharmacist',
        permanent: true,
      },
    ]
  },
};

export default nextConfig;
