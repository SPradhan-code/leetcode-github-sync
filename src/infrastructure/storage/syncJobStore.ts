import {
  SyncJobSchema,
  type SyncJob,
} from '../../domain/syncJob';

export interface SyncJobArea {
  get(key: string): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
}

const JOBS_KEY = 'syncJobs';
const MAX_ACTIVE_JOBS = 10;
const MAX_TERMINAL_JOBS = 50;

export class SyncJobStore {
  private writeChain: Promise<void> = Promise.resolve();

  constructor(private readonly area: SyncJobArea) {}

  private async readAll(): Promise<Record<string, SyncJob>> {
    const result = await this.area.get(JOBS_KEY);
    const raw = result[JOBS_KEY];

    if (raw === undefined) return {};

    if (
      raw === null ||
      typeof raw !== 'object' ||
      Array.isArray(raw)
    ) {
      throw new Error('Stored sync-job data is invalid');
    }

    const jobs: Record<string, SyncJob> = {};

    for (const [key, value] of Object.entries(raw)) {
      const parsed = SyncJobSchema.safeParse(value);

      if (!parsed.success || parsed.data.id !== key) {
        throw new Error(`Invalid stored sync job: ${key}`);
      }

      jobs[key] = parsed.data;
    }

    return jobs;
  }

  private async writeAll(
    jobs: Record<string, SyncJob>,
  ): Promise<void> {
    await this.area.set({ [JOBS_KEY]: jobs });
  }

  private serialize<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.writeChain.then(operation);

    this.writeChain = result.then(
      () => undefined,
      () => undefined,
    );

    return result;
  }

  async list(): Promise<SyncJob[]> {
    await this.writeChain;
    return Object.values(await this.readAll());
  }

  async enqueue(job: SyncJob): Promise<boolean> {
    return this.serialize(async () => {
      const jobs = await this.readAll();

      // Idempotency: the same LeetCode submission creates one job.
      if (jobs[job.id]) return false;

      const activeCount = Object.values(jobs).filter(
        (item) =>
          item.status === 'pending' ||
          item.status === 'processing',
      ).length;

      if (activeCount >= MAX_ACTIVE_JOBS) {
        throw new Error('Sync queue is full');
      }

      jobs[job.id] = job;

      const terminal = Object.values(jobs)
        .filter(
          (item) =>
            item.status === 'completed' ||
            item.status === 'failed',
        )
        .sort((a, b) =>
          b.updatedAt.localeCompare(a.updatedAt),
        );

      for (const oldJob of terminal.slice(MAX_TERMINAL_JOBS)) {
        delete jobs[oldJob.id];
      }

      await this.writeAll(jobs);
      return true;
    });
  }

  async recoverInterrupted(): Promise<number> {
    return this.serialize(async () => {
      const jobs = await this.readAll();
      let recovered = 0;
      const now = new Date().toISOString();

      for (const job of Object.values(jobs)) {
        if (job.status === 'processing') {
          job.status = 'pending';
          job.updatedAt = now;
          job.lastError = 'Recovered after interrupted processing';
          recovered++;
        }
      }

      if (recovered > 0) await this.writeAll(jobs);
      return recovered;
    });
  }

  async claimNext(): Promise<SyncJob | null> {
    return this.serialize(async () => {
      const jobs = await this.readAll();

      const next = Object.values(jobs)
        .filter((job) => job.status === 'pending')
        .sort((a, b) =>
          a.createdAt.localeCompare(b.createdAt),
        )[0];

      if (!next) return null;

      next.status = 'processing';
      next.attempts++;
      next.updatedAt = new Date().toISOString();
      next.lastError = null;

      await this.writeAll(jobs);
      return next;
    });
  }

  async finish(
    id: string,
    status: 'completed' | 'failed',
    error: string | null = null,
  ): Promise<void> {
    return this.serialize(async () => {
      const jobs = await this.readAll();
      const job = jobs[id];

      if (!job) throw new Error(`Sync job not found: ${id}`);

      job.status = status;
      job.updatedAt = new Date().toISOString();
      job.lastError = error?.slice(0, 500) ?? null;

      await this.writeAll(jobs);
    });
  }
}
