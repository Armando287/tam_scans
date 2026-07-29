import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // removed firebase-admin
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
