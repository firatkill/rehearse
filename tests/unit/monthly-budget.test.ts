import { afterEach, expect, it } from 'vitest';
import { openSqlite } from '@/lib/storage/sqlite/repository';
import { createBudgetTracker } from '@/lib/cost/budget';
const db = openSqlite(':memory:');
afterEach(() => {
  db.exec('DELETE FROM cost_events');
});
it('TC-164 warns at 80 and 100 percent without blocking and resets by UTC month', () => {
  let now = new Date('2026-11-30T23:59:59Z');
  const tracker = createBudgetTracker(db, () => now);
  tracker.record('a', 3.95);
  expect(tracker.read(5).level).toBe('none');
  tracker.record('b', 0.05);
  expect(tracker.read(5).level).toBe('80');
  tracker.record('c', 0.95);
  expect(tracker.read(5).level).toBe('80');
  tracker.record('d', 0.05);
  expect(tracker.read(5).level).toBe('100');
  tracker.record('e', 2);
  expect(tracker.read(5).spentUsd).toBe(7);
  tracker.record('e', 2);
  expect(tracker.read(5).spentUsd).toBe(7);
  now = new Date('2026-12-01T00:00:00Z');
  expect(tracker.read(5)).toMatchObject({ month: '2026-12', spentUsd: 0, level: 'none' });
  tracker.record('f', 1);
  expect(tracker.read(5).spentUsd).toBe(1);
  expect(() => {
    tracker.record('bad', -1);
  }).toThrow();
});
