import type { NextConfig } from 'next';
import { z } from 'zod';
const edition = z.enum(['demo', 'full']).parse(process.env.APP_EDITION ?? 'full');

const nextConfig: NextConfig = {
  output: 'standalone',
  serverExternalPackages: ['better-sqlite3'],
  distDir: edition === 'demo' && !process.env.VERCEL_ENV ? '.next-demo' : '.next',
  env: { NEXT_PUBLIC_APP_EDITION: edition },
  outputFileTracingIncludes: { '/how-it-works': ['./eval/results/*.json'] },
};
export default nextConfig;
