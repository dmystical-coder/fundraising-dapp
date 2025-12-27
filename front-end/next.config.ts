import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Transpile @stacks packages to fix dynamic import issues with connect modal
  transpilePackages: [
    "@stacks/connect",
    "@stacks/connect-ui",
  ],
  webpack: (config) => {
    config.externals.push("pino-pretty", "lokijs", "encoding");
    return config;
  },
};

export default nextConfig;
