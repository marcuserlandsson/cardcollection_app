import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "world.digimoncard.com",
        pathname: "/images/cardlist/card/**",
      },
    ],
  },
};

export default nextConfig;
