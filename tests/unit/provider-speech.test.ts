import { beforeEach, expect, it, vi } from 'vitest';
import { generateSpeech } from '@/lib/tts/provider';
import { pcmWave, waveSeconds } from '@/lib/tts/audio';
import { getEnv, resetEnvForTests } from '@/lib/env';
import { TTS } from '@/lib/config';
const pcm = new Uint8Array(48_000);
beforeEach(() => {
  vi.stubEnv('APP_EDITION', 'full');
  vi.stubEnv('LLM_MODE', 'live');
  vi.stubEnv('OPENAI_API_KEY', 'fake-openai');
  vi.stubEnv('CHAT_MODEL', 'fixture-chat');
  vi.stubEnv('PRICE_INPUT_PER_MTOK', '1');
  vi.stubEnv('PRICE_OUTPUT_PER_MTOK', '2');
  vi.stubEnv('TTS_MODEL', 'fixture-speech');
  vi.stubEnv('TTS_VOICE', 'fixture-voice');
  vi.stubEnv('TTS_PRICE', '10');
  vi.stubEnv('TTS_PRICE_UNIT', 'characters');
  vi.stubEnv('GOOGLE_GENERATIVE_AI_API_KEY', 'fake-google');
  vi.stubEnv('ELEVENLABS_API_KEY', 'fake-eleven');
  resetEnvForTests();
});
it.each(['openai', 'gemini', 'elevenlabs'] as const)(
  'TC-224 %s synthesises Turkish through a fake transport, with configured model and cost',
  async (provider) => {
    vi.stubEnv('TTS_PROVIDER', provider);
    const request = vi.fn<typeof fetch>().mockResolvedValue(
      provider === 'gemini'
        ? Response.json({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      inlineData: {
                        mimeType: 'audio/wav',
                        data: Buffer.from(pcmWave(pcm)).toString('base64'),
                      },
                    },
                  ],
                },
              },
            ],
          })
        : new Response(pcm),
    );
    const result = await generateSpeech(
      'Bir örnek anlat.',
      'tr',
      new AbortController().signal,
      request,
    );
    expect(waveSeconds(result.audio)).toBe(1);
    expect(result.costUsd).toBeCloseTo(0.00016);
    const [url, options] = request.mock.calls[0]!;
    expect(typeof url === 'string' ? url : url instanceof URL ? url.href : url.url).toContain(
      provider === 'openai'
        ? 'api.openai.com'
        : provider === 'gemini'
          ? 'generativelanguage.googleapis.com'
          : 'api.elevenlabs.io',
    );
    expect(JSON.stringify(options)).toContain(
      provider === 'gemini' ? 'fixture-voice' : 'fixture-speech',
    );
    expect(JSON.stringify(options)).toContain('Bir örnek anlat.');
    expect(options?.redirect).toBe('error');
    if (provider === 'gemini')
      expect(typeof url === 'string' ? url : url instanceof URL ? url.href : url.url).toContain(
        'fixture-speech',
      );
  },
);
it('TC-224 minute pricing uses generated audio duration', async () => {
  vi.stubEnv('TTS_PROVIDER', 'openai');
  vi.stubEnv('TTS_PRICE_UNIT', 'minute');
  const result = await generateSpeech(
    'Hello',
    'en',
    new AbortController().signal,
    vi.fn<typeof fetch>().mockResolvedValue(new Response(pcm)),
  );
  expect(result.costUsd).toBeCloseTo(10 / 60);
});
it('TC-224 demo ignores provider settings and never calls transport', async () => {
  vi.stubEnv('APP_EDITION', 'demo');
  vi.stubEnv('TTS_PROVIDER', 'invalid');
  expect(getEnv().TTS_PROVIDER).toBe('browser');
  const request = vi.fn<typeof fetch>();
  await expect(
    generateSpeech('Hello', 'en', new AbortController().signal, request),
  ).rejects.toMatchObject({ code: 'DEMO_ONLY' });
  expect(request).not.toHaveBeenCalled();
});
it('TC-224 mock speech never calls the configured provider', async () => {
  vi.stubEnv('LLM_MODE', 'mock');
  vi.stubEnv('TTS_PROVIDER', 'openai');
  const request = vi.fn<typeof fetch>();
  expect((await generateSpeech('Hello', 'en', new AbortController().signal, request)).costUsd).toBe(
    0,
  );
  expect(request).not.toHaveBeenCalled();
});
it.each(['TTS_MODEL', 'TTS_VOICE', 'TTS_PRICE', 'ELEVENLABS_API_KEY'])(
  'TC-224 selected provider requires %s',
  (name) => {
    vi.stubEnv('TTS_PROVIDER', 'elevenlabs');
    vi.stubEnv(name, undefined);
    expect(getEnv).toThrow(name);
  },
);
it('TC-224 oversized and invalid provider responses fail safely', async () => {
  vi.stubEnv('TTS_PROVIDER', 'openai');
  await expect(
    generateSpeech(
      'hello',
      'en',
      new AbortController().signal,
      vi
        .fn<typeof fetch>()
        .mockResolvedValue(new Response(new Uint8Array(TTS.MAX_AUDIO_BYTES + 1))),
    ),
  ).rejects.toMatchObject({ code: 'PROVIDER_ERROR' });
  await expect(
    generateSpeech(
      'hello',
      'en',
      new AbortController().signal,
      vi
        .fn<typeof fetch>()
        .mockResolvedValue(new Response('secret provider error', { status: 500 })),
    ),
  ).rejects.toMatchObject({ code: 'PROVIDER_ERROR' });
  expect(() => waveSeconds(new Uint8Array(44))).toThrow();
});
