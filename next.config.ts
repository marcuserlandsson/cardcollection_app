import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.digimoncard.io",
        pathname: "/images/cards/**",
      },
    ],
  },
};

export default nextConfig;
