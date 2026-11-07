import { randomUUID } from 'node:crypto';
import { readJobWithAi } from '@/lib/jobpost/ai-reader';
import { fetchJobPost } from '@/lib/jobpost/fetch';
import { z } from 'zod';
import { getEnv } from '@/lib/env';
import { JOBPOST, LANGUAGE_FEATURES } from '@/lib/config';
import { AppError } from '@/lib/errors';
import { checkOrigin, readJsonBody, jsonError } from '@/lib/request';
import { JobRequestSchema, JobResponseSchema } from '@/lib/api/jobpost-contracts';
import { getJobRepository } from '@/lib/jobpost/repository';
import { generateJobQuestions } from '@/lib/jobpost/generate';
import { getJobpostProvider, jobpostPrices } from '@/lib/jobpost/provider';
import { analyzeJobPost } from '@/lib/jobpost/analyze';
import { jobpostPrompt } from '@/lib/prompts/language';
import { InvalidOutputError, ProviderTimeoutError, ProviderError } from '@/lib/llm/provider';
import { getBank } from '@/lib/questions/bank';
import { estimateCostUsd } from '@/lib/cost/estimate';
import { recordCost } from '@/lib/cost/budget';
import { getLogger } from '@/lib/logger';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function POST(request: Request): Promise<Response> {
  const requestId = randomUUID();
  try {
    const env = getEnv();
    if (env.APP_EDITION !== 'full') throw new AppError('DEMO_ONLY');
    checkOrigin(request, env);
    const input = JobRequestSchema.parse(await readJsonBody(request, JOBPOST.REQUEST_MAX_BYTES));
    if ('language' in input && input.language === 'tr' && !LANGUAGE_FEATURES.turkishSessions)
      throw new AppError('VALIDATION_FAILED');
    const repo = getJobRepository();
    let post;
    if (input.operation === 'readAi') {
      const fetched = await readJobWithAi(input.url, requestId);
      post = repo.create(fetched.text, fetched.sourceUrl, input.language);
    } else if (input.operation === 'fetch') {
      const fetched = await fetchJobPost(input.url);
      post = repo.create(fetched.text, fetched.sourceUrl, input.language);
    } else if (input.operation === 'create') post = repo.create(input.text, null, input.language);
    else if (input.operation === 'setInterviewDate')
      post = repo.setInterviewDate(input.id, input.interviewDate);
    else if (input.operation === 'updateText') post = repo.updateText(input.id, input.text);
    else post = repo.get(input.id);
    if (!post) throw new AppError('JOBPOST_NOT_FOUND');
    if (
      input.operation === 'analyze' ||
      input.operation === 'generate' ||
      input.operation === 'more'
    ) {
      if (!post.analysis) {
        const provider = getJobpostProvider();
        const result = await analyzeJobPost(post.text, post.language, provider);
        recordCost(
          `${requestId}:analysis`,
          provider.modelId === 'mock' ? 0 : estimateCostUsd(result.usage, jobpostPrices()),
        );
        post = repo.saveAnalysis(
          post.id,
          {
            ...result.analysis,
            model: provider.modelId,
            promptVersion: jobpostPrompt(post.language).version,
          },
          post.text,
        );
      }
    }
    if (input.operation === 'generate' || input.operation === 'more') {
      const stored = repo.questions(post.id);
      const existing = stored
        .filter((question) => question.origin === 'generated')
        .map((question) => question.text);
      const count = input.operation === 'more' ? JOBPOST.MORE_QUESTIONS : JOBPOST.INITIAL_QUESTIONS;
      if (
        (input.operation === 'generate' ? existing.length > 0 : existing.length === 0) ||
        stored.length + count > JOBPOST.MAX_STORED_QUESTIONS
      )
        throw new AppError('VALIDATION_FAILED');
      const provider = getJobpostProvider();
      const started = Date.now();
      const result = await generateJobQuestions({
        text: post.text,
        ...(post.analysis ? { analysis: post.analysis } : {}),
        language: post.language,
        count,
        existing,
        provider,
        bankQuestions: getBank(post.language).questions.map((question) => question.prompt),
      });
      const costUsd =
        provider.modelId === 'mock' ? 0 : estimateCostUsd(result.usage, jobpostPrices());
      recordCost(requestId, costUsd);
      const saved = repo.commitGeneration(
        post.id,
        result.summary,
        result.questions,
        provider.modelId,
      );
      getLogger().info({
        event: 'jobpost.generated',
        requestId,
        questionCount: saved.questions.length,
        latencyMs: Date.now() - started,
        inputTokens: result.usage.inputTokens,
        outputTokens: result.usage.outputTokens,
        costUsd,
      });
      return Response.json(JobResponseSchema.parse(saved), {
        headers: { 'Cache-Control': 'no-store' },
      });
    }
    return Response.json(JobResponseSchema.parse({ post, questions: repo.questions(post.id) }), {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    const code =
      error instanceof AppError
        ? error.code
        : error instanceof z.ZodError
          ? 'VALIDATION_FAILED'
          : error instanceof InvalidOutputError
            ? 'JOBPOST_INVALID'
            : error instanceof ProviderTimeoutError
              ? 'PROVIDER_TIMEOUT'
              : error instanceof ProviderError
                ? 'PROVIDER_ERROR'
                : 'INTERNAL_ERROR';
    return jsonError(code, requestId);
  }
}
