import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const configFileDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(dirname(configFileDir));

const nextConfig: NextConfig = {
  transpilePackages: [
    "@tsuku-portal/ui",
    "@tsuku-portal/config",
    "@tsuku-portal/types",
  ],
  turbopack: {
    root: repoRoot,
  },
};

export default nextConfig;
