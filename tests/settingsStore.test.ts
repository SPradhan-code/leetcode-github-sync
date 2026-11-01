import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '../src/domain/settings';
import { SettingsStore, type KeyValueArea } from '../src/infrastructure/storage/settingsStore';

function memoryArea(initial: Record<string, unknown> = {}): KeyValueArea {
  const data = { ...initial };
  return {
    get: async (key) => (key in data ? { [key]: data[key] } : {}),
    set: async (items) => void Object.assign(data, items),
  };
}

describe('SettingsStore', () => {
  it('returns defaults when nothing is stored', async () => {
    expect(await new SettingsStore(memoryArea()).load()).toEqual(DEFAULT_SETTINGS);
  });
  it('loads stored values', async () => {
    const store = new SettingsStore(memoryArea({ settings: { autoSyncEnabled: false } }));
    expect((await store.load()).autoSyncEnabled).toBe(false);
  });
  it('recovers from corrupt stored data', async () => {
    const store = new SettingsStore(memoryArea({ settings: 42 }));
    expect(await store.load()).toEqual(DEFAULT_SETTINGS);
  });
});