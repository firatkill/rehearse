import 'server-only';
import { z } from 'zod';
import { TTS, type Language } from '@/lib/config';
import { getEnv } from '@/lib/env';
import { AppError } from '@/lib/errors';
import { pcmWave, waveSeconds } from './audio';
const GeminiAudio = z.object({
  candidates: z
    .array(
      z.object({
        content: z.object({
          parts: z.array(
            z.object({
              inlineData: z.object({ mimeType: z.string(), data: z.string() }).optional(),
            }),
          ),
        }),
      }),
    )
    .min(1),
});
async function bounded(response: Response): Promise<Uint8Array<ArrayBuffer>> {
  if (!response.ok || !response.body) throw new AppError('PROVIDER_ERROR');
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const next = await reader.read();
      if (next.done) break;
      size += next.value.byteLength;
      if (size > TTS.MAX_AUDIO_BYTES) throw new AppError('PROVIDER_ERROR');
      chunks.push(next.value);
    }
  } finally {
    await reader.cancel();
  }
  const output = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.length;
  }
  return output;
}
export async function generateSpeech(
  text: string,
  language: Language,
  signal: AbortSignal,
  request: typeof fetch = fetch,
) {
  const env = getEnv();
  if (env.APP_EDITION !== 'full' || env.TTS_PROVIDER === 'browser') throw new AppError('DEMO_ONLY');
  if (!text || text.length > TTS.MAX_TEXT_CHARS) throw new AppError('VALIDATION_FAILED');
  if (env.LLM_MODE === 'mock') return { audio: pcmWave(new Uint8Array(4800)), costUsd: 0 };
  const model = env.TTS_MODEL,
    voice = env.TTS_VOICE;
  if (!model || !voice) throw new AppError('PROVIDER_ERROR');
  let audio: Uint8Array<ArrayBuffer>;
  if (env.TTS_PROVIDER === 'gemini') {
    const response = await request(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: 'POST',
        signal,
        redirect: 'error',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': env.GOOGLE_GENERATIVE_AI_API_KEY ?? '',
        },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text }] }],
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: { voiceConfig: { voice } },
          },
        }),
      },
    );
    const parsed = GeminiAudio.parse(JSON.parse(new TextDecoder().decode(await bounded(response))));
    const part = parsed.candidates[0]?.content.parts.find((item) => item.inlineData)?.inlineData;
    if (!part) throw new AppError('PROVIDER_ERROR');
    const bytes = Uint8Array.from(Buffer.from(part.data, 'base64'));
    if (/audio\/(?:wav|x-wav)/i.test(part.mimeType)) audio = bytes;
    else if (/audio\/(?:L16|pcm);.*rate=24000/i.test(part.mimeType)) audio = pcmWave(bytes);
    else throw new AppError('PROVIDER_ERROR');
  } else {
    const openai = env.TTS_PROVIDER === 'openai';
    const response = await request(
      openai
        ? 'https://api.openai.com/v1/audio/speech'
        : `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voice)}?output_format=pcm_24000`,
      {
        method: 'POST',
        signal,
        redirect: 'error',
        headers: {
          'Content-Type': 'application/json',
          ...(openai
            ? { Authorization: `Bearer ${env.OPENAI_API_KEY ?? ''}` }
            : { 'xi-api-key': env.ELEVENLABS_API_KEY ?? '' }),
        },
        body: JSON.stringify(
          openai
            ? { model, voice, input: text, response_format: 'pcm' }
            : { model_id: model, text, language_code: language },
        ),
      },
    );
    audio = pcmWave(await bounded(response));
  }
  const seconds = waveSeconds(audio);
  if (!(seconds > 0) || seconds > TTS.PLAYBACK_TIMEOUT_MS / 1000)
    throw new AppError('PROVIDER_ERROR');
  const costUsd =
    (env.TTS_PRICE ?? 0) *
    (env.TTS_PRICE_UNIT === 'minute' ? seconds / 60 : Array.from(text).length / 1_000_000);
  return { audio, costUsd };
}
