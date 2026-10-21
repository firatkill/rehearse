import { FEEDBACK_LIMITS } from '@/lib/config';
export function normalizeForMatch(s: string): string {
  return s
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[‘’`´]/g, "'")
    .replace(/[^\p{L}\p{N}']+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function verifyEvidence(evidence: string, transcript: string): boolean {
  const e = normalizeForMatch(evidence);
  if (e.length === 0 || e.split(' ').length < FEEDBACK_LIMITS.EVIDENCE_MIN_WORDS) return false;
  return ` ${normalizeForMatch(transcript)} `.includes(` ${e} `);
}
