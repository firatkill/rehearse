'use client';
import { createMemoryRepository } from '@/lib/storage/memory-repository';
import type { SessionRepository } from '@/lib/storage/repository';
import type { SessionRecord, AnswerRecord } from '@/lib/storage/schema';

let repository: SessionRepository | undefined;
export function useRepository(): SessionRepository {
  repository ??= createMemoryRepository();
  return repository;
}
export async function switchToMemoryRepository(session: SessionRecord, answers: AnswerRecord[]) {
  const fallback = createMemoryRepository();
  await fallback.createSession(session);
  await Promise.all(answers.map((answer) => fallback.putAnswer(answer)));
  repository = fallback;
  return fallback;
}
