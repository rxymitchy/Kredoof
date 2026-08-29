import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  transpilePackages: ["@rainbow-me/rainbowkit", "@wagmi/core", "wagmi"],
};

export default nextConfig;
