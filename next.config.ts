import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "s3.hf.co",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.hf.co",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
