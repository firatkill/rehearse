import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  outputFileTracingIncludes: { '/how-it-works': ['./eval/results/*.json'] },
};
export default nextConfig;
