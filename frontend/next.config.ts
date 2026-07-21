import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    outputFileTracingIncludes: {
      '**/*': ['./drizzle/**/*'],
    },
  },
};

export default nextConfig;
