'use client';
import { createMemoryRepository } from '@/lib/storage/memory-repository';
import type { SessionRepository } from '@/lib/storage/repository';

let repository: SessionRepository | undefined;
export function useRepository(): SessionRepository {
  repository ??= createMemoryRepository();
  return repository;
}
