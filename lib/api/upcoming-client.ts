import { UpcomingResponseSchema } from './upcoming-contracts';
export async function requestUpcoming() {
  try {
    const response = await fetch('/api/job-posts/upcoming', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    if (!response.ok) return null;
    return UpcomingResponseSchema.parse(await response.json()).posts;
  } catch {
    return null;
  }
}
