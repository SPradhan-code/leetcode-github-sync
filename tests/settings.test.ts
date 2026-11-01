import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, parseSettings } from '../src/domain/settings';

describe('parseSettings', () => {
  it('returns defaults for undefined', () => {
    expect(parseSettings(undefined)).toEqual(DEFAULT_SETTINGS);
  });
  it('merges valid partial data over defaults', () => {
    expect(parseSettings({ syncPaused: true })).toEqual({ ...DEFAULT_SETTINGS, syncPaused: true });
  });
  it('falls back to defaults on invalid types', () => {
    expect(parseSettings({ autoSyncEnabled: 'yes' })).toEqual(DEFAULT_SETTINGS);
  });
});