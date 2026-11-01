import { parseSettings, type Settings } from '../../domain/settings';

export interface KeyValueArea {
  get(key: string): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
}

const SETTINGS_KEY = 'settings';

export class SettingsStore {
  constructor(private readonly area: KeyValueArea) {}

  async load(): Promise<Settings> {
    const result = await this.area.get(SETTINGS_KEY);
    return parseSettings(result[SETTINGS_KEY]);
  }
}
