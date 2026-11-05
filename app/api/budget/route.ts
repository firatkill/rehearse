import { getEnv } from '@/lib/env';
import { getMonthlyBudget } from '@/lib/cost/budget';
import { jsonError } from '@/lib/request';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export function GET() {
  if (getEnv().APP_EDITION !== 'full') return jsonError('DEMO_ONLY', crypto.randomUUID());
  try {
    return Response.json(getMonthlyBudget(), { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return jsonError('INTERNAL_ERROR', crypto.randomUUID());
  }
}
