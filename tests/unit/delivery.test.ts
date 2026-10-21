import { expect, it } from 'vitest';
import { computeDelivery } from '@/lib/metrics/delivery';
it('TC-061 UT-06 FR-24 voice timing excludes leading/trailing silence and edits preserve raw pace/fillers', () => {
  const a = {
    mode: 'voice' as const,
    rawTranscript: 'um I delivered better results',
    transcript: 'I delivered results',
    timing: {
      recordingMs: 120000,
      firstResultOffsetMs: 5000,
      resultOffsetsMs: [5000, 10000, 15000],
    },
  };
  expect(computeDelivery(a)).toEqual({
    words: 3,
    speakingMs: 10000,
    wpm: 30,
    fillers: { total: 1, byPhrase: { um: 1 } },
    longestPauseMs: 5000,
    longPauses: 2,
  });
  expect(
    computeDelivery({
      ...a,
      transcript: 'Edited words',
      timing: { ...a.timing, recordingMs: 240000 },
    }),
  ).toMatchObject({ words: 2, speakingMs: 10000, wpm: 30, fillers: { total: 1 } });
  expect(computeDelivery({ ...a, mode: 'text' })).toMatchObject({
    speakingMs: null,
    wpm: null,
    fillers: { total: 0 },
    longestPauseMs: null,
  });
});
it('TC-061 UT-06 FR-24 no or short timing suppresses pace; only result-event offsets determine speaking time', () => {
  const a = {
    mode: 'voice' as const,
    rawTranscript: 'One two three',
    transcript: 'One two three',
    timing: { recordingMs: 50000, firstResultOffsetMs: null, resultOffsetsMs: [] as number[] },
  };
  expect(computeDelivery(a)).toMatchObject({ speakingMs: null, wpm: null, longestPauseMs: null });
  expect(
    computeDelivery({
      ...a,
      timing: { recordingMs: 50000, firstResultOffsetMs: 1000, resultOffsetsMs: [1000, 10999] },
    }),
  ).toMatchObject({ speakingMs: 9999, wpm: null });
  expect(
    computeDelivery({
      ...a,
      timing: { recordingMs: 50000, firstResultOffsetMs: 1000, resultOffsetsMs: [11000, 1000] },
    }),
  ).toMatchObject({ speakingMs: 10000, wpm: 18 });
  expect(
    computeDelivery({
      ...a,
      timing: { recordingMs: 50000, firstResultOffsetMs: 1000, resultOffsetsMs: [500] },
    }),
  ).toMatchObject({ speakingMs: 0, wpm: null });
});
