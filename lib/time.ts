export function utcDate(now: Date): string {
  return now.toISOString().slice(0, 10);
}
export function nextUtcMidnight(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
}
export function formatMmSs(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
export function formatDurationWords(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  if (remainder === 0) return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
  if (seconds < 120) return `${seconds} seconds`;
  return `${minutes} minutes ${remainder} seconds`;
}
