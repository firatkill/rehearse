import 'server-only';
import { createOpenAI } from '@ai-sdk/openai';
import { generateText, Output } from 'ai';
import { z } from 'zod';
import { getEnv, type Env } from '@/lib/env';
import { JOBPOST } from '@/lib/config';
import { JOBREAD_SYSTEM_PROMPT, JOBREAD_PROMPT_VERSION } from '@/lib/prompts/jobread';
import { getLogger } from '@/lib/logger';
import { AppError } from '@/lib/errors';
import { estimateCostUsd } from '@/lib/cost/estimate';
import { recordCost } from '@/lib/cost/budget';
import type { LlmUsage } from '@/lib/llm/provider';
import { jobUrl, resolvePublicAddress, type Resolver } from './ssrf';
import { JobTextSchema } from '@/lib/storage/jobpost-schema';

export const AiReadSchema = z.object({ text: z.string() }).strict();
export function aiReadEstimate(env: Env): number | null {
  if (env.APP_EDITION !== 'full') return null;
  if (env.LLM_MODE === 'mock') return 0;
  if (env.PRICE_WEB_SEARCH_PER_CALL === undefined) return null;
  return (
    env.PRICE_WEB_SEARCH_PER_CALL +
    estimateCostUsd(
      {
        inputTokens: JOBPOST.AI_READ_ESTIMATE_INPUT_TOKENS,
        outputTokens: JOBPOST.AI_READ_MAX_OUTPUT_TOKENS,
        cachedInputTokens: 0,
      },
      {
        input: env.PRICE_INPUT_PER_MTOK,
        output: env.PRICE_OUTPUT_PER_MTOK,
        cachedInput: env.PRICE_CACHED_INPUT_PER_MTOK,
      },
    )
  );
}
export type AiJobReader = (args: {
  url: URL;
  signal: AbortSignal;
  onUsage: (usage: LlmUsage) => void;
}) => Promise<{ text: string; sources: string[] }>;
/** Provider-owned web retrieval is restricted by domain, then checked against the exact URL. */
export function createAiJobReader(env: Env): AiJobReader {
  if (env.APP_EDITION !== 'full') throw new AppError('DEMO_ONLY');
  if (env.LLM_MODE === 'mock')
    return ({ url }) =>
      Promise.resolve({
        text: 'Mock engineering job post. Build accessible TypeScript interfaces. Maintain reliable API integrations. Write automated tests and document operational runbooks. Work with product colleagues to investigate customer problems. Review changes and improve observability.',
        sources: [url.href],
      });
  if (!env.OPENAI_API_KEY || !env.CHAT_MODEL || env.PRICE_WEB_SEARCH_PER_CALL === undefined)
    throw new AppError('JOBPOST_AI_READ_UNAVAILABLE');
  const openai = createOpenAI({ apiKey: env.OPENAI_API_KEY });
  const model = env.CHAT_MODEL;
  return async ({ url, signal, onUsage }) => {
    const result = await generateText({
      model: openai.responses(model),
      instructions: JOBREAD_SYSTEM_PROMPT,
      prompt: JSON.stringify({ url: url.href }),
      output: Output.object({ schema: AiReadSchema, name: JOBREAD_PROMPT_VERSION }),
      tools: {
        web_search: openai.tools.webSearch({
          externalWebAccess: true,
          searchContextSize: 'low',
          filters: { allowedDomains: [url.hostname] },
        }),
      },
      toolChoice: { type: 'tool', toolName: 'web_search' },
      providerOptions: {
        openai: {
          strictJsonSchema: true,
          maxToolCalls: 1,
          store: false,
          ...(env.CHAT_REASONING_EFFORT ? { reasoningEffort: env.CHAT_REASONING_EFFORT } : {}),
        },
      },
      maxRetries: 0,
      maxOutputTokens: JOBPOST.AI_READ_MAX_OUTPUT_TOKENS,
      abortSignal: signal,
      onStepEnd(step) {
        onUsage({
          inputTokens: step.usage.inputTokens ?? 0,
          outputTokens: step.usage.outputTokens ?? 0,
          cachedInputTokens: step.usage.inputTokenDetails.cacheReadTokens ?? 0,
        });
      },
    });
    const sources = result.sources.flatMap((source) =>
      source.sourceType === 'url' ? [source.url] : [],
    );
    for (const tool of result.toolResults) {
      if (tool.toolName !== 'web_search') continue;
      const parsed = z
        .object({ action: z.object({ url: z.string().nullish() }).optional() })
        .safeParse(tool.output);
      if (parsed.success && parsed.data.action?.url) sources.push(parsed.data.action.url);
    }
    return { text: AiReadSchema.parse(result.output).text, sources };
  };
}
export async function readJobWithAi(
  source: string,
  requestId: string,
  dependencies: { reader?: AiJobReader; resolve?: Resolver } = {},
) {
  const env = getEnv();
  if (env.APP_EDITION !== 'full') throw new AppError('DEMO_ONLY');
  if (aiReadEstimate(env) === null) throw new AppError('JOBPOST_AI_READ_UNAVAILABLE');
  const url = jobUrl(source);
  // Validate before sending a URL to any provider. No local/private targets, credentials or alternate ports.
  const signal = AbortSignal.timeout(JOBPOST.AI_READ_TIMEOUT_MS);
  let costUsd = 0;
  const started = Date.now();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new AppError('JOBPOST_AI_READ_FAILED'));
    }, JOBPOST.AI_READ_TIMEOUT_MS);
  });
  try {
    await Promise.race([resolvePublicAddress(url, dependencies.resolve), timeout]);
    const result = await Promise.race([
      (dependencies.reader ?? createAiJobReader(env))({
        url,
        signal,
        onUsage(usage) {
          if (env.LLM_MODE === 'live')
            costUsd +=
              (env.PRICE_WEB_SEARCH_PER_CALL ?? 0) +
              estimateCostUsd(usage, {
                input: env.PRICE_INPUT_PER_MTOK,
                output: env.PRICE_OUTPUT_PER_MTOK,
                cachedInput: env.PRICE_CACHED_INPUT_PER_MTOK,
              });
        },
      }),
      timeout,
    ]);
    const exact =
      result.sources.length > 0 &&
      result.sources.every((source) => {
        try {
          return jobUrl(source).href === url.href;
        } catch {
          return false;
        }
      });
    if (!exact) throw new AppError('JOBPOST_AI_READ_FAILED');
    const text = JobTextSchema.safeParse(result.text);
    if (!text.success) throw new AppError('JOBPOST_AI_READ_FAILED');
    return { text: text.data, sourceUrl: url.href };
  } catch {
    throw new AppError('JOBPOST_AI_READ_FAILED');
  } finally {
    clearTimeout(timer);
    recordCost(requestId, costUsd);
    getLogger().info({
      event: 'jobpost.ai_read',
      requestId,
      latencyMs: Date.now() - started,
      costUsd,
      promptVersion: JOBREAD_PROMPT_VERSION,
    });
  }
}
