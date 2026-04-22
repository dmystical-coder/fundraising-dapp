import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname, ".."),
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
