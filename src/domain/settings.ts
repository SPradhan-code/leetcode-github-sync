import { z } from 'zod';

export const SettingsSchema = z.object({
  autoSyncEnabled: z.boolean(),
  syncPaused: z.boolean(),
  syncNonAccepted: z.boolean(),
});

export type Settings = z.infer<typeof SettingsSchema>;

export const DEFAULT_SETTINGS: Settings = {
  autoSyncEnabled: true,
  syncPaused: false,
  syncNonAccepted: false,
};

/** Merges stored data over defaults. Any invalid stored value falls back to all defaults. */
export function parseSettings(raw: unknown): Settings {
  const parsed = SettingsSchema.partial().safeParse(raw);
  return { ...DEFAULT_SETTINGS, ...(parsed.success ? parsed.data : {}) };
}