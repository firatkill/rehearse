import { expect, it } from 'vitest';
import { ANSWER, SPEECH } from '@/lib/config';
import {
  initialRecorder,
  recorderReducer,
  type RecorderEvent,
  type RecorderSnapshot,
} from '@/lib/speech/recorder-machine';
import { fullText } from '@/lib/speech/transcript';
const step = (s: RecorderSnapshot, e: RecorderEvent) => recorderReducer(s, e);
const start = () => step(initialRecorder(), { type: 'START', now: 100 });
const result = (s: RecorderSnapshot, text = 'I led', now = 500) =>
  step(s, { type: 'RESULT', now, results: [{ transcript: text, isFinal: false }] });
it('TC-050 UT-16 start, run, result, restart and retry preserve committed text', () => {
  let s = start();
  expect(s.state).toEqual({ kind: 'starting', run: 1 });
  s = step(s, { type: 'RUN_STARTED' });
  expect(s.state.kind).toBe('listening');
  s = result(s);
  expect(s.ctx.resultOffsetsMs).toEqual([400]);
  s = step(s, { type: 'END' });
  expect(s.state).toEqual({ kind: 'restarting', run: 1 });
  s = step(s, { type: 'RESTART_DUE' });
  expect(s.state).toEqual({ kind: 'starting', run: 2 });
  s = step(s, { type: 'ERROR', code: 'not-allowed' });
  s = recorderReducer(s, { type: 'START', now: 2000 }, 2);
  expect(s.state).toEqual({ kind: 'starting', run: 3 });
  expect(s.ctx.startedAtMs).toBe(100);
  expect(fullText(s.ctx.transcript)).toBe('I led');
  expect(s.ctx).toMatchObject({
    restarts: 0,
    noSpeechRestarts: 0,
    sawNoSpeech: false,
    runHadResult: false,
  });
});
it('TC-050 UT-16 twenty productive runs never hit the empty restart ceiling', () => {
  let s = start();
  for (let run = 1; run <= 20; run++) {
    s = result(s, `word${run}`);
    s = step(s, { type: 'END' });
    expect(s.state).toEqual({ kind: 'restarting', run });
    expect(s.ctx.restarts).toBe(0);
    s = step(s, { type: 'RESTART_DUE' });
  }
  expect(fullText(s.ctx.transcript).split(' ')).toHaveLength(20);
});
it('TC-050 UT-16 stops after the specified consecutive empty restarts', () => {
  let s = start();
  for (let run = 0; run < SPEECH.MAX_RESTARTS; run++) {
    s = step(s, { type: 'END' });
    expect(s.state.kind).toBe('restarting');
    s = step(s, { type: 'RESTART_DUE' });
  }
  expect(step(s, { type: 'END' }).state).toEqual({ kind: 'stopped', reason: 'unexpected_stop' });
  expect(result(s).ctx.restarts).toBe(0);
});
it('TC-051 UT-16 no-speech retries twice and fails on the third empty run', () => {
  let s = start();
  for (let run = 0; run < 3; run++) {
    s = step(s, { type: 'ERROR', code: 'no-speech' });
    s = step(s, { type: 'END' });
    if (run < 2) {
      expect(s.state.kind).toBe('restarting');
      s = step(s, { type: 'RESTART_DUE' });
    }
  }
  expect(s.state).toEqual({ kind: 'failed', fail: 'no-speech' });
  let withWords = result(start());
  withWords = step(withWords, { type: 'ERROR', code: 'no-speech' });
  expect(step(withWords, { type: 'END' }).state.kind).toBe('restarting');
});
it.each([
  ['not-allowed', 'permission'],
  ['audio-capture', 'no-device'],
  ['service-not-allowed', 'unavailable'],
  ['language-not-supported', 'unavailable'],
  ['bad-grammar', 'unavailable'],
  ['phrases-not-supported', 'unavailable'],
  ['start-failed', 'unavailable'],
  ['unknown', 'unavailable'],
] as const)('TC-051 UT-16 maps %s and preserves words', (code, fail) => {
  const s = step(result(start()), { type: 'ERROR', code });
  expect(s.state).toEqual({ kind: 'failed', fail });
  expect(fullText(s.ctx.transcript)).toBe('I led');
  const restarting = step(start(), { type: 'END' });
  expect(step(restarting, { type: 'ERROR', code }).state).toEqual({ kind: 'failed', fail });
});
it('TC-051 UT-16 network uses word presence, and aborted is ignored', () => {
  expect(step(start(), { type: 'ERROR', code: 'network' }).state).toEqual({
    kind: 'failed',
    fail: 'unavailable',
  });
  expect(step(result(start()), { type: 'ERROR', code: 'network' }).state).toEqual({
    kind: 'stopped',
    reason: 'network',
  });
  const s = start();
  expect(step(s, { type: 'ERROR', code: 'aborted' })).toBe(s);
});
it.each(['user', 'time_limit', 'char_cap', 'tab_hidden', 'network', 'unexpected_stop'] as const)(
  'TC-052 UT-16 stop %s keeps late results and finishes on END',
  (reason) => {
    let s = step(result(start()), { type: 'STOP', reason });
    expect(s.state).toEqual({ kind: 'stopping', run: 1, reason });
    s = result(s, 'I led the team', 900);
    expect(s.state.kind).toBe('stopping');
    expect(s.ctx.resultOffsetsMs).toEqual([400]);
    s = step(s, { type: 'END' });
    expect(s.state).toEqual({ kind: 'stopped', reason });
    expect(fullText(s.ctx.transcript)).toBe('I led the team');
  },
);
it('TC-052 UT-16 stop while restarting is immediate; grace timeout commits', () => {
  expect(step(step(start(), { type: 'END' }), { type: 'STOP', reason: 'user' }).state).toEqual({
    kind: 'stopped',
    reason: 'user',
  });
  const s = step(result(start()), { type: 'STOP', reason: 'time_limit' });
  expect(step(s, { type: 'GRACE_TIMEOUT' })).toMatchObject({
    state: { kind: 'stopped', reason: 'time_limit' },
    ctx: { transcript: { committed: 'I led' } },
  });
});
it('TC-052 UT-16 character cap stops and result-offset history is bounded', () => {
  const s = start();
  s.ctx.resultOffsetsMs = Array.from({ length: SPEECH.RESULT_OFFSETS_MAX }, (_, i) => i);
  const capped = result(s, 'a'.repeat(ANSWER.MAX_CHARS));
  expect(capped.state).toEqual({ kind: 'stopping', run: 1, reason: 'char_cap' });
  expect(capped.ctx.resultOffsetsMs).toHaveLength(SPEECH.RESULT_OFFSETS_MAX);
});
it('TC-050 UT-16 unrelated events cannot restart terminal or idle states', () => {
  const events: RecorderEvent[] = [
    { type: 'RUN_STARTED' },
    { type: 'RESULT', now: 100, results: [] },
    { type: 'END' },
    { type: 'STOP', reason: 'user' },
    { type: 'GRACE_TIMEOUT' },
    { type: 'RESTART_DUE' },
    { type: 'ERROR', code: 'network' },
  ];
  for (const s of [
    initialRecorder(),
    step(step(start(), { type: 'STOP', reason: 'user' }), { type: 'END' }),
  ])
    for (const event of events) expect(step(s, event)).toBe(s);
  const s = start();
  expect(step(s, { type: 'START', now: 999 })).toBe(s);
});
