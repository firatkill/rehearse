'use client';
import { useSyncExternalStore } from 'react';
import { createMemoryRepository } from '@/lib/storage/memory-repository';
import { createIndexedDbRepository } from '@/lib/storage/idb-repository';
import { openDb, StorageBlockedError, StorageClosedError } from '@/lib/storage/idb';
import { storageStatus, subscribeStorage, setStorageStatus } from '@/lib/storage/status';
import type { SessionRepository } from '@/lib/storage/repository';
import type { SessionRecord, AnswerRecord } from '@/lib/storage/schema';

let repository: Promise<SessionRepository> | undefined;
let persistent = false;
export function getRepository(): Promise<SessionRepository> {
  repository ??= (async () => {
    try {
      if (typeof indexedDB === 'undefined') throw new Error('Storage unavailable');
      const repo = createIndexedDbRepository(await openDb());
      persistent = true;
      setStorageStatus('persistent');
      return repo;
    } catch (error) {
      setStorageStatus(error instanceof StorageBlockedError ? 'blocked' : 'not-saving');
      return createMemoryRepository();
    }
  })();
  return repository;
}
// A stable facade lets existing asynchronous repository calls wait for startup without
// restarting room effects when IndexedDB finishes opening.
const facade: SessionRepository = {
  get persistent() {
    return persistent;
  },
  createSession: async (session) => (await getRepository()).createSession(session),
  getSession: async (id) => (await getRepository()).getSession(id),
  updateSession: async (id, patch) => (await getRepository()).updateSession(id, patch),
  listSessions: async () => (await getRepository()).listSessions(),
  deleteSession: async (id) => (await getRepository()).deleteSession(id),
  putAnswer: async (answer) => (await getRepository()).putAnswer(answer),
  getAnswers: async (id) => (await getRepository()).getAnswers(id),
  exportAll: async (version) => (await getRepository()).exportAll(version),
  importAll: async (file) => (await getRepository()).importAll(file),
  deleteAll: async () => (await getRepository()).deleteAll(),
};
export function useRepository(): SessionRepository {
  return facade;
}
export function useStorageStatus() {
  return useSyncExternalStore(subscribeStorage, storageStatus, () => 'pending' as const);
}
export async function switchToMemoryRepository(
  session: SessionRecord,
  answers: AnswerRecord[],
  error?: unknown,
) {
  const fallback = createMemoryRepository();
  await fallback.createSession(session);
  await Promise.all(answers.map((answer) => fallback.putAnswer(answer)));
  repository = Promise.resolve(fallback);
  persistent = false;
  setStorageStatus(
    error instanceof StorageClosedError || storageStatus() === 'updated' ? 'updated' : 'not-saving',
  );
  return fallback;
}
