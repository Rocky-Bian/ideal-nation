import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/human", destination: "/", permanent: true },
      { source: "/ai", destination: "/", permanent: true },
      { source: "/hybrid", destination: "/ideal", permanent: true },
    ];
  },
};

export default nextConfig;
