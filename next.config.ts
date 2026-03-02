import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Fix: agent files use `.js` extensions (ESM style) — resolve them to `.ts`
  webpack: (config) => {
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js"],
      ".mjs": [".mts", ".mjs"],
    };
    return config;
  },
  // Fix: suppress multiple lockfiles warning
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
