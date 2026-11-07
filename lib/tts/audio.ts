import { TTS } from '@/lib/config';
/** Provider PCM is signed 16-bit little-endian, mono. No audio is persisted. */
export function pcmWave(
  pcm: Uint8Array,
  sampleRate = TTS.PCM_SAMPLE_RATE,
): Uint8Array<ArrayBuffer> {
  const output = new Uint8Array(44 + pcm.byteLength);
  const view = new DataView(output.buffer);
  const ascii = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
  };
  ascii(0, 'RIFF');
  view.setUint32(4, 36 + pcm.byteLength, true);
  ascii(8, 'WAVE');
  ascii(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  ascii(36, 'data');
  view.setUint32(40, pcm.byteLength, true);
  output.set(pcm, 44);
  return output;
}
export function waveSeconds(audio: Uint8Array): number {
  const view = new DataView(audio.buffer, audio.byteOffset, audio.byteLength);
  const ascii = (offset: number) => String.fromCharCode(...audio.subarray(offset, offset + 4));
  if (audio.length < 44 || ascii(0) !== 'RIFF' || ascii(8) !== 'WAVE')
    throw new Error('Invalid audio');
  let rate = 0;
  for (let offset = 12; offset + 8 <= audio.length;) {
    const length = view.getUint32(offset + 4, true);
    if (length > audio.length - offset - 8) throw new Error('Invalid audio');
    if (ascii(offset) === 'fmt ' && length >= 16) rate = view.getUint32(offset + 16, true);
    if (ascii(offset) === 'data' && rate > 0) return length / rate;
    offset += 8 + length + (length % 2);
  }
  throw new Error('Invalid audio');
}
