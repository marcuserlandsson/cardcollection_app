import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.digimoncard.io",
        pathname: "/images/**",
      },
      {
        protocol: "https",
        hostname: "assets.orangeswim.dev",
        pathname: "/other/**",
      },
      {
        protocol: "https",
        hostname: "cardtrader.com",
        pathname: "/uploads/**",
      },
      {
        protocol: "https",
        hostname: "world.digimoncard.com",
        pathname: "/images/**",
      },
    ],
  },
};

export default nextConfig;
