import 'server-only';
import {
  DIMENSIONS,
  LLM,
  SUMMARY_LIMITS,
  type Dimension,
  type Role,
  type Seniority,
} from '@/lib/config';
import type { SummaryRequest } from '@/lib/api/contracts';
import { aggregate } from '@/lib/report/aggregate';
import { buildSummaryUserMessage, SUMMARY_SYSTEM_PROMPT } from '@/lib/prompts/summary';
import { SUMMARY_PROMPT_VERSION } from '@/lib/prompts/version';
import { cleanText } from '@/lib/feedback/normalize';
import { AppError } from '@/lib/errors';
import {
  InvalidOutputError,
  ProviderError,
  ProviderTimeoutError,
  type LlmProvider,
} from '@/lib/llm/provider';
import { SummaryLlmSchema, SummarySchema } from './schema';

export async function generateSummary(args: {
  items: SummaryRequest['items'];
  role: Role;
  seniority: Seniority;
  provider: LlmProvider;
  maxOutputTokens: number;
  now?: () => number;
}) {
  const now = args.now ?? Date.now;
  const start = now();
  const items = [...args.items].sort((a, b) => a.answerIndex - b.answerIndex);
  const values = aggregate(
    items.map((item) => ({
      index: item.answerIndex,
      status: 'scored',
      feedback: {
        scores: Object.fromEntries(
          DIMENSIONS.map((d) => [d, { score: item.scores[d], rationale: '' }]),
        ) as Record<Dimension, { score: number; rationale: string }>,
        overall:
          Math.round(
            (DIMENSIONS.reduce((sum, d) => sum + item.scores[d], 0) / DIMENSIONS.length) * 10,
          ) / 10,
      },
    })),
    Math.max(...items.map((i) => i.answerIndex)) + 1,
  );
  if (values.trend === 'none') throw new AppError('VALIDATION_FAILED');
  const means = Object.fromEntries(
    DIMENSIONS.map((d) => [d, values.dimensionMeans[d] ?? 0]),
  ) as Record<Dimension, number>;
  try {
    const result = await args.provider.generateStructured({
      schema: SummaryLlmSchema,
      schemaName: 'interview_summary',
      system: SUMMARY_SYSTEM_PROMPT,
      prompt: buildSummaryUserMessage({
        ...args,
        items,
        dimensionMeans: means,
        overallByQuestion: values.perQuestion.flatMap((q) =>
          q.overall === null ? [] : [q.overall],
        ),
        trend: values.trend,
        focus: values.focus,
      }),
      maxOutputTokens: args.maxOutputTokens,
      signal: AbortSignal.timeout(LLM.SUMMARY_TIMEOUT_MS),
    });
    const raw = SummaryLlmSchema.safeParse(result.object);
    if (!raw.success) throw new InvalidOutputError();
    const data = raw.data;
    const normalized = SummarySchema.safeParse({
      headline: cleanText(data.headline, SUMMARY_LIMITS.HEADLINE_MAX_CHARS),
      paragraph: cleanText(data.paragraph, SUMMARY_LIMITS.PARAGRAPH_MAX_CHARS),
      next_practice: cleanText(data.next_practice, SUMMARY_LIMITS.NEXT_PRACTICE_MAX_CHARS),
      focus_notes: values.focus.map((d) => {
        const note = data.focus_notes.find((n) => n.dimension === d);
        return {
          dimension: d,
          note: note ? cleanText(note.note, SUMMARY_LIMITS.NOTE_MAX_CHARS) : null,
        };
      }),
      generated_at: new Date(now()).toISOString(),
      model: args.provider.modelId,
      prompt_version: SUMMARY_PROMPT_VERSION,
    });
    if (!normalized.success) throw new InvalidOutputError();
    return { summary: normalized.data, usage: result.usage, latencyMs: now() - start };
  } catch (error) {
    if (error instanceof InvalidOutputError) throw new AppError('FEEDBACK_INVALID');
    if (error instanceof ProviderTimeoutError) throw new AppError('PROVIDER_TIMEOUT');
    if (error instanceof ProviderError) throw new AppError('PROVIDER_ERROR');
    throw error;
  }
}
