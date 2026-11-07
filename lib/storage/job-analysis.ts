import { z } from 'zod';
import { JOBPOST } from '@/lib/config';
export const AnalysisPointSchema = z
  .object({
    text: z.string().trim().min(1).max(500),
    groundingQuote: z.string().trim().min(1).max(1000),
  })
  .strict();
export const JobAnalysisSchema = z
  .object({
    roleSummary: AnalysisPointSchema,
    mustHaves: z.array(AnalysisPointSchema).max(JOBPOST.ANALYSIS_MAX_POINTS),
    niceToHaves: z.array(AnalysisPointSchema).max(JOBPOST.ANALYSIS_MAX_POINTS),
    likelyProbes: z.array(AnalysisPointSchema).min(1).max(JOBPOST.ANALYSIS_MAX_POINTS),
  })
  .strict();
export type JobAnalysis = z.infer<typeof JobAnalysisSchema>;
export const StoredJobAnalysisSchema = JobAnalysisSchema.extend({
  model: z.string().min(1).max(160),
  promptVersion: z.string().min(1),
});
export function normaliseJobText(text: string): string {
  return text
    .normalize('NFKC')
    .replaceAll('‹', '<')
    .replaceAll('›', '>')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase('en');
}
export function groundedJobQuote(quote: string, text: string): boolean {
  const source = normaliseJobText(text),
    value = normaliseJobText(quote);
  const words = value.match(/[\p{L}\p{N}]+/gu) ?? [];
  const sentence = source
    .split(/(?<=[.!?])\s+/u)
    .some((part) => part === value && /[.!?]$/u.test(part));
  return (
    source.includes(value) &&
    words.length > 0 &&
    (sentence ||
      (value.length >= JOBPOST.MIN_QUOTE_CHARS && words.length >= JOBPOST.MIN_QUOTE_WORDS))
  );
}
export function analysisPoints(analysis: JobAnalysis) {
  return [
    analysis.roleSummary,
    ...analysis.mustHaves,
    ...analysis.niceToHaves,
    ...analysis.likelyProbes,
  ];
}
export function groundedAnalysis(analysis: JobAnalysis, text: string) {
  return analysisPoints(analysis).every((point) => groundedJobQuote(point.groundingQuote, text));
}
