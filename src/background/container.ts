
import {
  SettingsStore,
  type KeyValueArea,
} from '../infrastructure/storage/settingsStore';
import {
  SyncJobStore,
  type SyncJobArea,
} from '../infrastructure/storage/syncJobStore';
import { SyncQueueProcessor } from '../application/syncQueueProcessor';

const chromeLocalArea: KeyValueArea = {
  get: (key) => chrome.storage.local.get(key),
  set: (items) => chrome.storage.local.set(items),
};

const chromeSyncJobArea: SyncJobArea = {
  get: (key) => chrome.storage.local.get(key),
  set: (items) => chrome.storage.local.set(items),
};

export const settingsStore = new SettingsStore(chromeLocalArea);
export const syncJobStore = new SyncJobStore(chromeSyncJobArea);

// Placeholder handler: GitHub uploading will be implemented separately.
export const syncQueueProcessor = new SyncQueueProcessor(
  settingsStore,
  syncJobStore,
  {
    async process(job) {
      throw new Error(
        `GitHub uploader not implemented for submission ${job.submission.submissionId}`,
      );
    },
  },
);
