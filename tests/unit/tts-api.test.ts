import { beforeEach, expect, it, vi } from 'vitest';
import { POST } from '@/app/api/tts/route';
import { resetEnvForTests, getEnv } from '@/lib/env';
import * as speech from '@/lib/tts/provider';
import * as budget from '@/lib/cost/budget';
import { pcmWave } from '@/lib/tts/audio';
import { signToken, type TokenPayload } from '@/lib/session/token';
import { signFollowUp } from '@/lib/session/follow-up';
import { getBank } from '@/lib/questions/bank';
import { TTS } from '@/lib/config';
const id = 'b1557bb8-eaa6-4d58-8d4c-7128c3a1454c';
beforeEach(() => {
  vi.stubEnv('APP_EDITION', 'full');
  vi.stubEnv('TTS_PROVIDER', 'openai');
  resetEnvForTests();
  vi.spyOn(budget, 'recordCost').mockImplementation(() => undefined);
  vi.spyOn(speech, 'generateSpeech').mockResolvedValue({
    audio: pcmWave(new Uint8Array(4800)),
    costUsd: 0.001,
  });
});
const request = (body: unknown, token?: string) =>
  new Request('http://localhost:3000/api/tts', {
    method: 'POST',
    headers: {
      origin: getEnv().NEXT_PUBLIC_SITE_URL,
      'content-type': 'application/json',
      ...(token ? { 'x-rehearse-session': token } : {}),
    },
    body: JSON.stringify(body),
  });
it('TC-224 preview uses only server-owned text, audio is not cached, cost is recorded', async () => {
  const response = await POST(request({ kind: 'preview', language: 'tr' }));
  expect(response.status).toBe(200);
  expect(response.headers.get('cache-control')).toBe('no-store');
  expect(speech.generateSpeech).toHaveBeenCalledWith(
    TTS.PREVIEW_TEXT_TR,
    'tr',
    expect.any(AbortSignal),
  );
  expect(budget.recordCost).toHaveBeenCalledWith(expect.any(String), 0.001);
  expect(
    (await POST(request({ kind: 'preview', language: 'en', text: 'arbitrary input' }))).status,
  ).toBe(400);
});
it('TC-224 question and follow-up require signed scope and language', async () => {
  const questions = getBank('tr').questions.slice(0, 3);
  const now = Math.floor(Date.now() / 1000);
  const payload: TokenPayload = {
    v: 1,
    l: 'tr',
    sid: id,
    iat: now,
    exp: now + 600,
    fb: 3,
    sm: 1,
    q: questions.map((q) => q.id),
    r: 'backend',
    s: 'mid',
    b: '1.0.0',
  };
  const token = signToken(payload, getEnv().SESSION_SECRET);
  const input = { kind: 'question', language: 'tr', questionId: questions[0]!.id, index: 0 };
  expect((await POST(request(input, token))).status).toBe(200);
  expect(speech.generateSpeech).toHaveBeenLastCalledWith(
    questions[0]!.prompt,
    'tr',
    expect.any(AbortSignal),
  );
  expect((await POST(request(input))).status).toBe(401);
  expect((await POST(request({ ...input, language: 'en' }, token))).status).toBe(403);
  const followUpToken = signFollowUp(payload, 0, 'Sonucu nasıl ölçtün?', getEnv().SESSION_SECRET);
  expect((await POST(request({ ...input, followUpToken }, token))).status).toBe(200);
  expect(speech.generateSpeech).toHaveBeenLastCalledWith(
    'Sonucu nasıl ölçtün?',
    'tr',
    expect.any(AbortSignal),
  );
  expect((await POST(request({ ...input, followUpToken: 'forged' }, token))).status).toBe(401);
});
it('TC-224 demo rejects speech before constructing providers', async () => {
  vi.stubEnv('APP_EDITION', 'demo');
  resetEnvForTests();
  expect((await POST(request({ kind: 'preview', language: 'en' }))).status).toBe(403);
  expect(speech.generateSpeech).not.toHaveBeenCalled();
});
