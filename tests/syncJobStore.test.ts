
import { describe, expect, it } from 'vitest';
import {
  SyncJobStore,
  type SyncJobArea,
} from '../src/infrastructure/storage/syncJobStore';
import { createSyncJob } from '../src/domain/syncJob';
import { makeSubmission } from './fixtures';

function memoryArea(): SyncJobArea {
  const data: Record<string, unknown> = {};

  return {
    get: async (key) =>
      key in data
        ? { [key]: structuredClone(data[key]) }
        : {},
    set: async (items) => {
      Object.assign(data, structuredClone(items));
    },
  };
}

describe('SyncJobStore', () => {
  it('stores a new job', async () => {
    const store = new SyncJobStore(memoryArea());
    const job = createSyncJob(makeSubmission());

    expect(await store.enqueue(job)).toBe(true);
    expect(await store.list()).toEqual([job]);
  });

  it('rejects a duplicate submission', async () => {
    const store = new SyncJobStore(memoryArea());
    const job = createSyncJob(makeSubmission());

    expect(await store.enqueue(job)).toBe(true);
    expect(await store.enqueue(job)).toBe(false);
    expect(await store.list()).toHaveLength(1);
  });

  it('claims the oldest pending job', async () => {
    const store = new SyncJobStore(memoryArea());
    const first = createSyncJob(
      makeSubmission({ submissionId: '123' }),
      '2026-01-01T00:00:00.000Z',
    );
    const second = createSyncJob(
      makeSubmission({ submissionId: '456' }),
      '2026-01-02T00:00:00.000Z',
    );

    await store.enqueue(second);
    await store.enqueue(first);

    const claimed = await store.claimNext();

    expect(claimed?.id).toBe('lc:123');
    expect(claimed?.status).toBe('processing');
    expect(claimed?.attempts).toBe(1);
  });

  it('recovers interrupted jobs', async () => {
    const store = new SyncJobStore(memoryArea());
    const job = createSyncJob(makeSubmission());

    await store.enqueue(job);
    await store.claimNext();

    expect(await store.recoverInterrupted()).toBe(1);
    expect((await store.list()).at(0)?.status).toBe('pending');
  });

  it('records completion', async () => {
    const store = new SyncJobStore(memoryArea());
    const job = createSyncJob(makeSubmission());

    await store.enqueue(job);
    await store.claimNext();
    await store.finish(job.id, 'completed');

    expect((await store.list()).at(0)?.status).toBe('completed');
  });

  it('serializes concurrent duplicate enqueue operations', async () => {
    const store = new SyncJobStore(memoryArea());
    const job = createSyncJob(makeSubmission());

    const results = await Promise.all([
      store.enqueue(job),
      store.enqueue(job),
      store.enqueue(job),
    ]);

    expect(results.filter(Boolean)).toHaveLength(1);
    expect(await store.list()).toHaveLength(1);
  });
});
