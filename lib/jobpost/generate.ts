import 'server-only';
import { analyzeJobPost } from './analyze';
import { groundedAnalysis, type JobAnalysis } from '@/lib/storage/job-analysis';
import { JOBPOST, type Language } from '@/lib/config';
import { AppError } from '@/lib/errors';
import type { LlmProvider } from '@/lib/llm/provider';
import { JobGenerationSchema } from './schema';
import { validateJobQuestions } from './validate';
import { jobpostPrompt } from '@/lib/prompts/language';
export async function generateJobQuestions(args: {
  language?: Language;
  text: string;
  provider: LlmProvider;
  existing?: readonly string[];
  bankQuestions: readonly string[];
  count?: number;
  analysis?: JobAnalysis;
}) {
  const prepared = args.analysis
    ? { analysis: args.analysis, usage: { inputTokens: 0, outputTokens: 0, cachedInputTokens: 0 } }
    : await analyzeJobPost(args.text, args.language ?? 'en', args.provider);
  if (!groundedAnalysis(prepared.analysis, args.text)) throw new AppError('JOBPOST_INVALID');
  const selectedPrompt = jobpostPrompt(args.language);
  const count = args.count ?? JOBPOST.INITIAL_QUESTIONS;
  const response = await args.provider.generateStructured({
    schema: JobGenerationSchema,
    schemaName: selectedPrompt.schemaName,
    system: selectedPrompt.system,
    prompt: selectedPrompt.build(
      args.text,
      Math.min(count + JOBPOST.EXTRA_CANDIDATES, JOBPOST.MAX_CANDIDATES),
      args.existing,
      prepared.analysis,
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
    analysis: prepared.analysis,
    questions: validation.questions.slice(0, count),
    validation,
    usage: {
      inputTokens: response.usage.inputTokens + prepared.usage.inputTokens,
      outputTokens: response.usage.outputTokens + prepared.usage.outputTokens,
      cachedInputTokens: response.usage.cachedInputTokens + prepared.usage.cachedInputTokens,
    },
  };
}
