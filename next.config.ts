import { compileClasses } from './scripts/compile-classes';
import type { NextConfig } from 'next';
import { z } from 'zod';
const edition = z.enum(['demo', 'full']).parse(process.env.APP_EDITION ?? 'full');

const nextConfig: NextConfig = {
  output: 'standalone',
  turbopack: { resolveAlias: { cn: './.generated/cn-runtime.mjs' } },
  serverExternalPackages: ['better-sqlite3'],
  distDir: edition === 'demo' && !process.env.VERCEL_ENV ? '.next-demo' : '.next',
  env: { NEXT_PUBLIC_APP_EDITION: edition },
  outputFileTracingIncludes: { '/how-it-works': ['./eval/results/*.json'] },
};
export default async function config() {
  await compileClasses();
  return nextConfig;
}
