import 'server-only';
import { getLogger } from '@/lib/logger';
import type Database from 'better-sqlite3';
import { z } from 'zod';
import { BUDGET } from '@/lib/config';
import { getEnv } from '@/lib/env';
import { getSqliteConnection } from '@/lib/storage/sqlite/repository';
import { BudgetSchema } from '@/lib/api/budget-contract';
export function createBudgetTracker(db: Database.Database, clock: () => Date = () => new Date()) {
  return {
    record(id: string, costUsd: number) {
      z.number().nonnegative().parse(costUsd);
      db.prepare('INSERT OR IGNORE INTO cost_events (id, at, cost_usd) VALUES (?, ?, ?)').run(
        id,
        clock().toISOString(),
        costUsd,
      );
    },
    read(budgetUsd: number) {
      const month = clock().toISOString().slice(0, 7);
      const row = z
        .object({ spent: z.number() })
        .parse(
          db
            .prepare(
              'SELECT COALESCE(SUM(cost_usd), 0) AS spent FROM cost_events WHERE substr(at, 1, 7) = ?',
            )
            .get(month),
        );
      return BudgetSchema.parse({
        month,
        spentUsd: row.spent,
        budgetUsd,
        level:
          row.spent >= budgetUsd
            ? '100'
            : row.spent >= budgetUsd * BUDGET.WARNING_RATIO
              ? '80'
              : 'none',
      });
    },
  };
}
export function recordCost(id: string, costUsd: number) {
  try {
    if (getEnv().APP_EDITION === 'full' && costUsd > 0)
      createBudgetTracker(getSqliteConnection()).record(id, costUsd);
  } catch {
    getLogger().warn({ event: 'cost.record_failed' });
  }
}
export function getMonthlyBudget() {
  return createBudgetTracker(getSqliteConnection()).read(getEnv().MONTHLY_BUDGET_USD);
}
