import type { NextConfig } from "next";
import { readBuildInfo } from "./scripts/read-build-info.mjs";

const build = readBuildInfo();

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  serverExternalPackages: ["@electric-sql/pglite"],
  env: {
    NEXT_PUBLIC_BUILD_NUMBER: build.number,
    NEXT_PUBLIC_BUILD_SHA: build.sha,
  },
};

export default nextConfig;
