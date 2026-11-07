import 'server-only';
import { JOBPOST, type Language } from '@/lib/config';
import { AppError } from '@/lib/errors';
import type { LlmProvider } from '@/lib/llm/provider';
import { jobAnalysisPrompt } from '@/lib/prompts/job-analysis';
import { JobAnalysisSchema, groundedAnalysis } from '@/lib/storage/job-analysis';
export async function analyzeJobPost(text: string, language: Language, provider: LlmProvider) {
  const prompt = jobAnalysisPrompt(text, language);
  const result = await provider.generateStructured({
    schema: JobAnalysisSchema,
    schemaName: language === 'tr' ? 'jobpost_analysis_tr' : 'jobpost_analysis',
    system: prompt.system,
    prompt: prompt.prompt,
    maxOutputTokens: JOBPOST.ANALYSIS_MAX_OUTPUT_TOKENS,
    signal: AbortSignal.timeout(JOBPOST.GENERATION_TIMEOUT_MS),
  });
  const parsed = JobAnalysisSchema.safeParse(result.object);
  if (!parsed.success) throw new AppError('JOBPOST_INVALID');
  const analysis = parsed.data;
  if (!groundedAnalysis(analysis, text)) throw new AppError('JOBPOST_INVALID');
  return { analysis, usage: result.usage };
}
