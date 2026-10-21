import { act, renderHook } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { useRecorder } from '@/hooks/use-recorder';
import { SPEECH } from '@/lib/config';
import type { SpeechRecognitionLike } from '@/lib/speech/types';
class FakeRecognition implements SpeechRecognitionLike {
  static instances: FakeRecognition[] = [];
  static throws = false;
  lang = '';
  continuous = false;
  interimResults = false;
  maxAlternatives = 0;
  onstart: SpeechRecognitionLike['onstart'] = null;
  onresult: SpeechRecognitionLike['onresult'] = null;
  onerror: SpeechRecognitionLike['onerror'] = null;
  onend: SpeechRecognitionLike['onend'] = null;
  constructor() {
    FakeRecognition.instances.push(this);
  }
  start = vi.fn(() => {
    if (FakeRecognition.throws) throw new Error('start failed');
    this.onstart?.();
  });
  stop = vi.fn();
  abort = vi.fn();
  emit(text: string) {
    this.onresult?.({
      resultIndex: 0,
      results: [Object.assign([{ transcript: text }], { isFinal: false })],
    });
  }
}
beforeEach(() => {
  FakeRecognition.instances = [];
  FakeRecognition.throws = false;
});
it('TC-052 UT-16 hook configures new runs and drops stale callbacks', () => {
  let clock = 100;
  const view = renderHook(() => useRecorder(FakeRecognition, () => clock));
  act(() => {
    view.result.current.start();
  });
  const first = FakeRecognition.instances[0]!;
  expect(first).toMatchObject({
    lang: SPEECH.LANG,
    continuous: true,
    interimResults: true,
    maxAlternatives: 1,
  });
  clock = 500;
  act(() => {
    first.emit('I led');
  });
  act(() => {
    first.onend?.();
    vi.advanceTimersByTime(SPEECH.RESTART_DELAY_MS);
  });
  const second = FakeRecognition.instances[1]!;
  act(() => {
    first.onerror?.({ error: 'not-allowed' });
    first.emit('STALE');
  });
  expect(view.result.current.state.kind).toBe('listening');
  clock = 1500;
  act(() => {
    second.emit('the delivery');
  });
  expect(view.result.current.rawTranscript).toBe('I led the delivery');
  act(() => {
    view.result.current.stop('user');
  });
  expect(second.stop).toHaveBeenCalledOnce();
  act(() => {
    second.emit('the delivery successfully');
    second.onend?.();
  });
  expect(view.result.current.state).toEqual({ kind: 'stopped', reason: 'user' });
  expect(view.result.current.getTiming()).toEqual({
    recordingMs: 1400,
    firstResultOffsetMs: 400,
    resultOffsetsMs: [400, 1400],
  });
  expect(view.result.current.getTranscript()).toBe('I led the delivery successfully');
  view.unmount();
  expect(vi.getTimerCount()).toBe(0);
});
it('TC-052 UT-16 grace abort, reset and unmount clean all resources', () => {
  const view = renderHook(() => useRecorder(FakeRecognition));
  act(() => {
    view.result.current.start();
  });
  const first = FakeRecognition.instances[0]!;
  act(() => {
    first.emit('partial');
    view.result.current.stop('tab_hidden');
    vi.advanceTimersByTime(SPEECH.STOP_GRACE_MS);
  });
  expect(view.result.current.state).toEqual({ kind: 'stopped', reason: 'tab_hidden' });
  expect(first.abort).toHaveBeenCalled();
  act(() => {
    view.result.current.reset();
    view.result.current.start();
  });
  expect(view.result.current.rawTranscript).toBe('');
  const second = FakeRecognition.instances[1]!;
  view.unmount();
  expect(second.abort).toHaveBeenCalled();
  expect(vi.getTimerCount()).toBe(0);
});
it('TC-051 UT-16 synchronous start failures and missing constructor surface unavailable', () => {
  FakeRecognition.throws = true;
  const view = renderHook(() => useRecorder(FakeRecognition));
  act(() => {
    view.result.current.start();
  });
  expect(view.result.current.state).toEqual({ kind: 'failed', fail: 'unavailable' });
  view.unmount();
  const absent = renderHook(() => useRecorder(null));
  act(() => {
    absent.result.current.start();
  });
  expect(absent.result.current.state).toEqual({ kind: 'failed', fail: 'unavailable' });
});
