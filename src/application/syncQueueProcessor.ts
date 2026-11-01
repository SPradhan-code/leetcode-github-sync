
import type { SyncJob } from '../domain/syncJob';
import type { SettingsStore } from '../infrastructure/storage/settingsStore';
import type { SyncJobStore } from '../infrastructure/storage/syncJobStore';

export interface JobHandler {
  process(job: SyncJob): Promise<void>;
}

export class SyncQueueProcessor {
  private running = false;

  constructor(
    private readonly settingsStore: SettingsStore,
    private readonly jobStore: SyncJobStore,
    private readonly handler: JobHandler,
  ) {}

  async processNext(): Promise<boolean> {
    if (this.running) return false;
    this.running = true;

    try {
      const settings = await this.settingsStore.load();

      if (settings.syncPaused || !settings.autoSyncEnabled) {
        return false;
      }

      const job = await this.jobStore.claimNext();
      if (!job) return false;

      try {
        await this.handler.process(job);
        await this.jobStore.finish(job.id, 'completed');
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown processing error';

        await this.jobStore.finish(job.id, 'failed', message);
      }

      return true;
    } finally {
      this.running = false;
    }
  }
}
