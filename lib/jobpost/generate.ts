import 'server-only';
import { JOBPOST } from '@/lib/config';
import { AppError } from '@/lib/errors';
import type { LlmProvider } from '@/lib/llm/provider';
import { JobGenerationSchema } from './schema';
import { validateJobQuestions } from './validate';
import { JOBPOST_SYSTEM_PROMPT, jobpostUserMessage } from '@/lib/prompts/jobpost';
export async function generateJobQuestions(args: {
  text: string;
  provider: LlmProvider;
  existing?: readonly string[];
  bankQuestions: readonly string[];
  count?: number;
}) {
  const count = args.count ?? JOBPOST.INITIAL_QUESTIONS;
  const response = await args.provider.generateStructured({
    schema: JobGenerationSchema,
    schemaName: 'jobpost_questions',
    system: JOBPOST_SYSTEM_PROMPT,
    prompt: jobpostUserMessage(
      args.text,
      Math.min(count + JOBPOST.EXTRA_CANDIDATES, JOBPOST.MAX_CANDIDATES),
      args.existing,
    ),
    maxOutputTokens: JOBPOST.MAX_OUTPUT_TOKENS,
    signal: AbortSignal.timeout(JOBPOST.GENERATION_TIMEOUT_MS),
  });
  const parsed = JobGenerationSchema.safeParse(response.object);
  if (!parsed.success) throw new AppError('JOBPOST_INVALID');
  const validation = validateJobQuestions(parsed.data.questions, args.text, [
    ...args.bankQuestions,
    ...(args.existing ?? []),
  ]);
  if (validation.questions.length < count) throw new AppError('JOBPOST_INVALID');
  return {
    summary: parsed.data,
    questions: validation.questions.slice(0, count),
    validation,
    usage: response.usage,
  };
}
