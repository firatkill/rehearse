import 'server-only';
import { getEnv } from '@/lib/env';
import { DEMO } from '@/lib/config';
import { AppError } from '@/lib/errors';
import { getProvider } from '@/lib/llm';
import { generateFeedback } from '@/lib/feedback/generate';
import { verifyEvidence } from '@/lib/feedback/evidence';
import { countWords } from '@/lib/metrics/words';
import { demoFeedback } from './content';
type Input = Omit<Parameters<typeof generateFeedback>[0], 'provider'>;
export function sampleFeedback(questionId: string, transcript: string) {
  const entry = demoFeedback.find((item) => item.questionId === questionId);
  if (!entry) throw new AppError('TOKEN_SCOPE');
  const signals = (text: string) => [
    countWords(text),
    (text.match(/\d+/g) ?? []).length,
    (text.match(/\bi\b/gi) ?? []).length - (text.match(/\bwe\b/gi) ?? []).length,
  ];
  const target = signals(transcript);
  const distance = (text: string) =>
    signals(text).reduce(
      (sum, value, index) =>
        sum + Math.abs(value - (target[index] ?? 0)) / (DEMO.SIGNAL_SCALES[index] ?? 1),
      0,
    );
  const selected = [...entry.variants].sort((a, b) => distance(a.answer) - distance(b.answer))[0];
  if (!selected) throw new AppError('INTERNAL_ERROR');
  let evidenceRemoved = 0;
  const feedback = {
    ...selected.feedback,
    strengths: selected.feedback.strengths.map((item) => {
      if (item.evidence && !verifyEvidence(item.evidence, transcript)) {
        evidenceRemoved++;
        return { ...item, evidence: null };
      }
      return item;
    }),
    improvements: selected.feedback.improvements.map((item) => ({
      ...item,
      vague_phrases:
        item.vague_phrases?.filter((phrase) => verifyEvidence(phrase, transcript)) ?? [],
    })),
  };
  return {
    feedback,
    evidenceRemoved,
    usage: { inputTokens: 0, outputTokens: 0, cachedInputTokens: 0 },
    attempts: 0,
    latencyMs: 0,
  };
}
/** Pick the edition at the boundary; demo never asks for a provider. */
export function getFeedbackSource(onAttempt: () => void = () => {}) {
  if (getEnv().APP_EDITION === 'demo')
    return {
      modelId: 'sample',
      generate: (input: Input) =>
        Promise.resolve(sampleFeedback(input.question.id, input.transcript)),
    };
  const provider = getProvider();
  return {
    modelId: provider.modelId,
    generate: (input: Input) =>
      generateFeedback({
        ...input,
        provider: {
          modelId: provider.modelId,
          generateStructured(args) {
            onAttempt();
            return provider.generateStructured(args);
          },
        },
      }),
  };
}
