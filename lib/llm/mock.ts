import 'server-only';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { ANSWER, DIMENSIONS, QUESTION_TYPES, type Dimension } from '@/lib/config';
import { getEnv } from '@/lib/env';
import { DIMENSION_LABELS } from '@/lib/labels';
import { countWords, tokenize } from '@/lib/metrics/words';
import {
  MOCK_FOCUS_TIPS,
  MOCK_OUTLINES,
  MOCK_RATIONALES,
  MOCK_SUMMARY_PARAGRAPH,
} from './mock-copy';
import {
  InvalidOutputError,
  ProviderError,
  ProviderTimeoutError,
  type LlmProvider,
} from './provider';

function wait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new ProviderTimeoutError());
      return;
    }
    const abort = () => {
      clearTimeout(timer);
      reject(new ProviderTimeoutError());
    };
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', abort);
      resolve();
    }, ms);
    signal.addEventListener('abort', abort, { once: true });
  });
}

const invalidOnce = new Set<string>();
const dimensionSchema = z.enum(DIMENSIONS);
function block(prompt: string, tag: string): string {
  return prompt.split(`<${tag}>`)[1]?.split(`</${tag}>`)[0]?.trim() ?? '';
}
function field(text: string, key: string): string {
  return (
    text
      .split('\n')
      .find((line) => line.startsWith(`${key}: `))
      ?.slice(key.length + 2) ?? ''
  );
}
function summary(prompt: string) {
  const session = block(prompt, 'session');
  const means = field(session, 'dimension_means');
  const ranked = DIMENSIONS.map((d) => ({
    dimension: d,
    mean: Number(means.match(new RegExp(`${d}=([0-9.]+)`))?.[1] ?? 0),
  })).sort((a, b) => b.mean - a.mean);
  const best = ranked[0]?.dimension ?? DIMENSIONS[0];
  const focus = field(session, 'focus_areas')
    .split(',')
    .flatMap((value) => {
      const parsed = dimensionSchema.safeParse(value.trim());
      return parsed.success ? [parsed.data] : [];
    });
  const first = focus[0] ?? DIMENSIONS[0];
  return {
    headline: `Your strongest area was ${DIMENSION_LABELS[best]}; focus next on ${DIMENSION_LABELS[first]}.`,
    paragraph: MOCK_SUMMARY_PARAGRAPH,
    focus_notes: focus.map((dimension) => ({
      dimension,
      note: `Practise ${DIMENSION_LABELS[dimension]}: ${MOCK_FOCUS_TIPS[dimension]}`,
    })),
    next_practice: `Run another session with the same question types and aim to improve ${DIMENSION_LABELS[first]}.`,
  };
}
function feedback(prompt: string, transcript: string) {
  const t = transcript.toLowerCase();
  const n = countWords(t);
  const context = /\b(when|at my|last (year|month|quarter)|the project|we had|our team)\b/.test(t);
  const action =
    /\bi (built|wrote|added|changed|decided|led|set up|moved|fixed|proposed|asked|rewrote|measured)\b/.test(
      t,
    );
  const result =
    /\b(as a result|result|reduced|increased|cut|improved|saved|which meant|outcome)\b/.test(t);
  const digits = t.match(/\d+/g)?.length ?? 0;
  const i = t.match(/\bi\b/g)?.length ?? 0;
  const we = t.match(/\bwe\b/g)?.length ?? 0;
  const question = block(prompt, 'question');
  const words = tokenize(field(question, 'prompt'))
    .map((token) => token.w)
    .filter((word) => word.length >= 5);
  const share = words.length ? words.filter((word) => t.includes(word)).length / words.length : 0;
  const relevance = share >= 0.25 ? 4 : share >= 0.15 ? 3 : share >= 0.05 ? 2 : 1;
  const sentences = t.split(/[.?!]/).filter((part) => countWords(part) > 0);
  const scores: Record<Dimension, number> = {
    structure: 1 + Number(context) + Number(action) + Number(result),
    specificity: digits === 0 ? 1 : digits === 1 ? 2 : digits < 4 ? 3 : 4,
    ownership: i === 0 ? 1 : i < we ? 2 : i >= 3 && we <= i / 2 ? 4 : 3,
    impact: !result ? 1 : digits === 0 ? 2 : digits === 1 ? 3 : 4,
    relevance,
    clarity:
      n < ANSWER.SHORT_WORDS || n > 550 ? 2 : n / Math.max(1, sentences.length) <= 22 ? 4 : 3,
  };
  const type = z.enum(QUESTION_TYPES).safeParse(field(question, 'type'));
  return {
    scores: Object.fromEntries(
      DIMENSIONS.map((dimension) => [
        dimension,
        { score: scores[dimension], rationale: MOCK_RATIONALES[dimension] },
      ]),
    ),
    strengths: [
      {
        point: 'You described a concrete situation.',
        evidence: t.includes('mock:bad-evidence')
          ? 'words that were never said'
          : transcript.trim().split(/\s+/).slice(0, 8).join(' '),
      },
    ],
    improvements: [
      {
        point: 'Quantify the result.',
        why: 'A number makes the impact easy to remember.',
        rewrite: 'As a result, [metric] went from [before] to [after].',
      },
    ],
    follow_up_question: 'What would you do differently next time?',
    model_answer_outline: MOCK_OUTLINES[type.success ? type.data : 'behavioral'],
    flags: {
      too_short: n < ANSWER.SHORT_WORDS,
      off_topic: relevance === 1 && n >= ANSWER.SHORT_WORDS,
      injection_suspected:
        /ignore (all|previous|the|your) (instructions|rules|rubric)|system prompt|give (me )?(a )?4/.test(
          t,
        ),
    },
  };
}
export function createMockProvider(): LlmProvider {
  return {
    modelId: 'mock',
    async generateStructured<T>(
      args: Parameters<LlmProvider['generateStructured']>[0] & { schema: z.ZodType<T> },
    ) {
      const transcript = block(
        args.prompt,
        args.prompt.includes('<transcript>') ? 'transcript' : 'answers',
      );
      await wait(
        getEnv().MOCK_LLM_DELAY_MS + (transcript.includes('mock:slow') ? 4000 : 0),
        args.signal,
      );
      if (transcript.includes('mock:provider-error')) throw new ProviderError('mock', false);
      if (transcript.includes('mock:timeout')) throw new ProviderTimeoutError();
      const once = transcript.includes('mock:invalid-once');
      const hash = createHash('sha256').update(transcript).digest('hex');
      const invalid = once ? !invalidOnce.has(hash) : transcript.includes('mock:invalid');
      if (once) invalidOnce.add(hash);
      const usage = {
        inputTokens: Math.ceil(args.prompt.length / 4),
        outputTokens: 350,
        cachedInputTokens: 0,
      };
      // Deliberately invalid test output exercises the consumer's validation/retry boundary.
      if (invalid) return { object: {} as T, usage };
      const object = args.prompt.includes('<transcript>')
        ? feedback(args.prompt, transcript)
        : summary(args.prompt);
      const parsed = args.schema.safeParse(object);
      if (!parsed.success) throw new InvalidOutputError();
      return { object: parsed.data, usage };
    },
  };
}
