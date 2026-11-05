import { expect, type Page, type TestInfo, type APIResponse } from '@playwright/test';
import { StartResponseSchema, ErrorBodySchema, type StartResponse } from '@/lib/api/contracts';
import { serverUrl, uniqueIp } from './helpers';

export const startBody = {
  role: 'full-stack',
  seniority: 'mid',
  types: ['behavioral'],
  length: 5,
  mode: 'text',
};
export async function apiStart(page: Page, info: TestInfo, offset = 0): Promise<StartResponse> {
  const origin = serverUrl(info, offset);
  const response = await page.request.post(`${origin}/api/sessions/start`, {
    headers: { Origin: origin, 'x-real-ip': uniqueIp(info) },
    data: startBody,
  });
  expect(response.status()).toBe(200);
  return StartResponseSchema.parse(await response.json());
}
export function feedbackBody(session: StartResponse) {
  return {
    sessionId: session.sessionId,
    answerIndex: 0,
    questionId: session.questions[0]!.id,
    mode: 'text',
    transcript: 'I improved the project by reducing retries from ten to two.',
  };
}
export async function apiFeedback(page: Page, info: TestInfo, session: StartResponse, offset = 0) {
  const origin = serverUrl(info, offset);
  return page.request.post(`${origin}/api/feedback`, {
    headers: {
      Origin: origin,
      'x-real-ip': uniqueIp(info),
      Authorization: `Bearer ${session.token ?? ''}`,
    },
    data: feedbackBody(session),
  });
}
export async function expectError(response: APIResponse, status: number, code: string) {
  expect(response.status()).toBe(status);
  expect(ErrorBodySchema.parse(await response.json()).error.code).toBe(code);
}
