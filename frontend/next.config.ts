import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    '**/*': ['./drizzle/**/*'],
  },
  /* config options here */
};

export default nextConfig;
