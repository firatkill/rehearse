import { TTS } from '@/lib/config';
export function chunkForSpeech(text: string, max = TTS.CHUNK_MAX_CHARS): string[] {
  const sentences =
    text
      .replace(/\s+/g, ' ')
      .trim()
      .match(/[^.!?]+[.!?]+["')\]]*|[^.!?]+$/g) ?? [];
  const chunks: string[] = [];
  for (const raw of sentences) {
    let s = raw.trim();
    while (s.length > max) {
      const cut = s.lastIndexOf(' ', max);
      const at = cut > 0 ? cut : max;
      chunks.push(s.slice(0, at).trim());
      s = s.slice(at).trim();
    }
    if (s) chunks.push(s);
  }
  return chunks;
}
