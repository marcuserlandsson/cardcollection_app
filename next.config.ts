import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.digimoncard.io",
        pathname: "/images/**",
      },
    ],
  },
};

export default nextConfig;
