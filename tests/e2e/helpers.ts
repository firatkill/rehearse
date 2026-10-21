import { createHash } from 'node:crypto';
import type { Page, TestInfo } from '@playwright/test';
import type { SpeechScenario } from './speech-mock';

const happy: SpeechScenario = {
  recognition: true,
  synthesis: true,
  mic: 'granted',
  ttsMsPerChar: 2,
  voices: [
    {
      name: 'Test English',
      lang: 'en-GB',
      localService: true,
      voiceURI: 'test-en-gb',
      default: true,
    },
  ],
  runs: [
    [
      { after: 100, text: 'I led', final: false },
      { after: 600, text: 'I led the project and improved delivery.', final: true },
    ],
  ],
};
export const scenarios = {
  happy,
  noRecognition: { ...happy, recognition: false },
  micDenied: { ...happy, mic: 'denied' },
  noSpeech: {
    ...happy,
    runs: [
      [
        { after: 50, error: 'no-speech' },
        { after: 60, end: true },
      ],
    ],
  },
  networkAfterWords: {
    ...happy,
    runs: [
      [
        { after: 100, text: 'I led the project', final: true },
        { after: 200, error: 'network' },
        { after: 210, end: true },
      ],
    ],
  },
  networkNoWords: {
    ...happy,
    runs: [
      [
        { after: 50, error: 'network' },
        { after: 60, end: true },
      ],
    ],
  },
  longAnswer: { ...happy, runs: [[{ after: 100, text: 'a'.repeat(4100), final: true }]] },
} satisfies Record<string, SpeechScenario>;

export function uniqueIp(testInfo: TestInfo): string {
  const hash = createHash('sha256').update(`${testInfo.testId}:${testInfo.retry}`).digest();
  const run: unknown = testInfo.config.metadata.runId;
  if (typeof run !== 'string') throw new Error('Missing E2E run id');
  return `10.${run}.${hash[0] ?? 0}.${hash[1] ?? 0}`;
}

export async function setHidden(page: Page, hidden: boolean): Promise<void> {
  await page.evaluate((value) => {
    Object.defineProperty(document, 'hidden', { configurable: true, value });
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: value ? 'hidden' : 'visible',
    });
    document.dispatchEvent(new Event('visibilitychange'));
  }, hidden);
}

type SpeechControl = {
  runs: number;
  overlaps: number;
  spoken: string[];
  active: {
    emit(text: string, final: boolean): void;
    fail(code: string): void;
    end(): void;
  } | null;
};

export function speech(page: Page) {
  return {
    active: () =>
      page.evaluate(
        () => (window as unknown as { __speech: SpeechControl }).__speech.active !== null,
      ),
    overlaps: () =>
      page.evaluate(() => (window as unknown as { __speech: SpeechControl }).__speech.overlaps),
    emit: (text: string, final: boolean) =>
      page.evaluate(
        ({ text, final }) => {
          (window as unknown as { __speech: SpeechControl }).__speech.active?.emit(text, final);
        },
        { text, final },
      ),
    fail: (code: string) =>
      page.evaluate((code) => {
        (window as unknown as { __speech: SpeechControl }).__speech.active?.fail(code);
      }, code),
    end: () =>
      page.evaluate(() => {
        (window as unknown as { __speech: SpeechControl }).__speech.active?.end();
      }),
    runs: () =>
      page.evaluate(() => (window as unknown as { __speech: SpeechControl }).__speech.runs),
    spoken: () =>
      page.evaluate(() => (window as unknown as { __speech: SpeechControl }).__speech.spoken),
  };
}

export function serverUrl(testInfo: TestInfo, offset = 0): string {
  const basePort: unknown = testInfo.config.metadata.basePort;
  if (typeof basePort !== 'number') throw new Error('Missing E2E base port');
  return `http://localhost:${basePort + offset}`;
}
