// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(), // Explicitly set project root
  },
};

export default nextConfig;