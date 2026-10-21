import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { loadEnvFile } from 'node:process';
import { z } from 'zod';
import { getEnv } from '@/lib/env';
import { getBank } from '@/lib/questions/bank';
import { selectQuestions } from '@/lib/questions/select';
import { toSnapshot } from '@/lib/questions/schema';
import { getProvider } from '@/lib/llm';
import { generateFeedback } from '@/lib/feedback/generate';
import { generateSummary } from '@/lib/summary/generate';
import { FEEDBACK_PROMPT_VERSION } from '@/lib/prompts/version';
import { computeDelivery } from '@/lib/metrics/delivery';
import { countWords } from '@/lib/metrics/words';
import { estimateCostUsd } from '@/lib/cost/estimate';
import { DIMENSIONS, STORAGE, SETUP_DEFAULTS, type Dimension } from '@/lib/config';
import type { SessionRecord, AnswerRecord } from '@/lib/storage/schema';
import { validateSample } from '@/lib/storage/sample-schema';
async function main() {
  try {
    loadEnvFile('.env.local');
  } catch (error) {
    if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error;
  }
  const env = getEnv();
  const mock = process.argv.includes('--mock');
  if (mock !== (env.LLM_MODE === 'mock'))
    throw new Error('Use --mock only with LLM_MODE=mock. Live generation is owner-only.');
  const input = z
    .array(
      z
        .object({
          questionId: z.string(),
          transcript: z.string().refine((text) => {
            const count = countWords(text);
            return count >= 120 && count <= 300;
          }),
        })
        .strict(),
    )
    .length(3)
    .parse(JSON.parse(await readFile('scripts/sample-transcripts.json', 'utf8')));
  const bank = getBank();
  const seed = '5a3c0e11';
  const setup: SessionRecord['setup'] = {
    role: 'full-stack',
    seniority: 'mid',
    types: ['behavioral', 'technical-concepts', 'system-design-lite'],
    length: 3,
    mode: 'voice',
    readAloud: true,
    voiceURI: null,
    rate: SETUP_DEFAULTS.rate,
  };
  const questions = selectQuestions(bank.questions, { ...setup, seed });
  const provider = getProvider();
  const id = randomUUID();
  const createdAt = new Date().toISOString();
  const answers: AnswerRecord[] = [];
  for (const [index, question] of questions.entries()) {
    const item = input[index];
    if (!item || item.questionId !== question.id)
      throw new Error('Transcript question does not match the sample seed.');
    const result = await generateFeedback({
      question,
      role: setup.role,
      seniority: setup.seniority,
      mode: 'voice',
      transcript: item.transcript,
      provider,
      maxOutputTokens: env.MAX_OUTPUT_TOKENS_FEEDBACK,
    });
    const count = Math.max(
      4,
      Math.ceil(((countWords(item.transcript) / 145) * 60000 - 9000) / 300),
    );
    let elapsed = 500;
    const resultOffsetsMs = Array.from({ length: count }, (_, i) => {
      elapsed += 300;
      if (i === Math.floor(count / 4)) elapsed += 2000 - 300;
      if (i === Math.floor(count / 2)) elapsed += 3000 - 300;
      if (i === Math.floor((count * 3) / 4)) elapsed += 4000 - 300;
      return elapsed;
    });
    const timing = {
      recordingMs: elapsed + 500,
      firstResultOffsetMs: resultOffsetsMs[0] ?? null,
      resultOffsetsMs,
    };
    const metrics = computeDelivery({
      mode: 'voice',
      transcript: item.transcript,
      rawTranscript: item.transcript,
      timing,
    });
    const costUsd = mock
      ? 0
      : Math.round(
          estimateCostUsd(result.usage, {
            input: env.PRICE_INPUT_PER_MTOK,
            output: env.PRICE_OUTPUT_PER_MTOK,
            cachedInput: env.PRICE_CACHED_INPUT_PER_MTOK,
          }) * 1e6,
        ) / 1e6;
    answers.push({
      schemaVersion: STORAGE.RECORD_SCHEMA_VERSION,
      sessionId: id,
      index,
      questionId: question.id,
      mode: 'voice',
      status: 'scored',
      rawTranscript: item.transcript,
      transcript: item.transcript,
      timing,
      metrics,
      feedback: result.feedback,
      feedbackMeta: {
        model: provider.modelId,
        promptVersion: FEEDBACK_PROMPT_VERSION,
        latencyMs: result.latencyMs,
        costUsd,
      },
      attempts: 1,
      notice: null,
      createdAt,
      updatedAt: new Date().toISOString(),
    });
  }
  const items = answers.flatMap((answer) => {
    const f = answer.feedback;
    if (!f) return [];
    return [
      {
        answerIndex: answer.index,
        questionId: answer.questionId,
        scores: Object.fromEntries(DIMENSIONS.map((d) => [d, f.scores[d].score])) as Record<
          Dimension,
          number
        >,
        improvementPoints: f.improvements.map((v) => v.point),
        flags: f.flags,
      },
    ];
  });
  const result = await generateSummary({
    items,
    role: setup.role,
    seniority: setup.seniority,
    provider,
    maxOutputTokens: env.MAX_OUTPUT_TOKENS_SUMMARY,
  });
  const completedAt = new Date().toISOString();
  const session: SessionRecord = {
    schemaVersion: STORAGE.RECORD_SCHEMA_VERSION,
    id,
    origin: 'sample',
    createdAt,
    updatedAt: completedAt,
    completedAt,
    status: 'completed',
    setup,
    currentMode: 'voice',
    seed,
    bankVersion: bank.bankVersion,
    questions: questions.map(toSnapshot),
    feedback: { enabled: true, reason: null },
    token: null,
    tokenExpiresAt: null,
    checkpoint: { index: 2, phase: 'done', at: completedAt },
    summary: result.summary,
    summaryStatus: 'done',
  };
  const sample = validateSample({ session, answers }, mock);
  await mkdir('content/sample', { recursive: true });
  await writeFile('content/sample/session.json', JSON.stringify(sample, null, 2) + '\n');
  console.log(`Generated ${answers.length} sample answers (${mock ? 'mock' : 'live'}).`);
}
void main().catch(() => {
  console.error(
    'Sample generation failed. Check configuration, transcript validation and provider availability.',
  );
  process.exitCode = 1;
});
