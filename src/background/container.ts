import {
  SettingsStore,
  type KeyValueArea,
} from '../infrastructure/storage/settingsStore';

const chromeLocalArea: KeyValueArea = {
  get: (key) => chrome.storage.local.get(key),
  set: (items) => chrome.storage.local.set(items),
};

export const settingsStore = new SettingsStore(chromeLocalArea);