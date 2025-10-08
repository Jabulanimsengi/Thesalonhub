import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_ORIGIN || "http://localhost:3000"}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;