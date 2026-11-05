import { z } from 'zod';
export const BudgetSchema = z
  .object({
    month: z.string().regex(/^\d{4}-\d{2}$/),
    spentUsd: z.number().nonnegative(),
    budgetUsd: z.number().positive(),
    level: z.enum(['none', '80', '100']),
  })
  .strict();
